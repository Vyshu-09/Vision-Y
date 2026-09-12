import { Router } from "express";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { publicUser, store } from "../db/store.js";
import { requireAuth, signToken, type AuthPayload } from "../middleware/auth.js";
import { isCloudinaryConfigured, uploadImageBuffer } from "../services/cloudinary.js";
import { normalizeRole } from "../types.js";

export const authRouter = Router();

const avatarDir = path.join(config.uploadDir, "avatars");
fs.mkdirSync(avatarDir, { recursive: true });

const useCloudinary = isCloudinaryConfigured();

const avatarUpload = multer({
  storage: useCloudinary
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, avatarDir),
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase() || ".png";
          const safeExt = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext) ? ext : ".png";
          cb(null, `${req.auth?.userId ?? "user"}-${Date.now()}${safeExt}`);
        },
      }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
    if (!ok) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  role: z.string().optional(),
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const rawEmail = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const email = rawEmail.includes("@") ? rawEmail : `${rawEmail}@university.edu`;

  const selected = parsed.data.role ? normalizeRole(parsed.data.role) : null;
  if (parsed.data.role && !selected) {
    res.status(400).json({ error: "Please select a valid role" });
    return;
  }

  const user = store.getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (selected && user.role !== selected) {
    res.status(403).json({
      error: `This account is registered as ${user.role.replace("_", " ")}. Please choose the matching role.`,
    });
    return;
  }

  const publicProfile = publicUser(user);
  const token = signToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });
  res.json({ token, user: publicProfile });
});

authRouter.get("/me", (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    const user = store.getUser(decoded.userId);
    if (!user) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

authRouter.post("/avatar", requireAuth, (req, res) => {
  avatarUpload.single("avatar")(req, res, (err) => {
    void (async () => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: "Choose an image file to upload" });
        return;
      }

      try {
        let avatar_url: string;
        if (useCloudinary && req.file.buffer) {
          avatar_url = await uploadImageBuffer(
            req.file.buffer,
            "vision-y/avatars",
            `user-${req.auth!.userId}`,
          );
        } else {
          avatar_url = `/uploads/avatars/${req.file.filename}`;
        }

        const updated = store.updateUser(req.auth!.userId, { avatar_url });
        if (!updated) {
          res.status(404).json({ error: "User not found" });
          return;
        }
        res.json({ user: publicUser(updated) });
      } catch (uploadErr) {
        console.error("[avatar]", uploadErr);
        res.status(500).json({
          error: uploadErr instanceof Error ? uploadErr.message : "Cloudinary upload failed",
        });
      }
    })();
  });
});

authRouter.delete("/avatar", requireAuth, (req, res) => {
  const updated = store.updateUser(req.auth!.userId, { avatar_url: null });
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: publicUser(updated) });
});
