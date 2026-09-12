-- UniPolicy AI — PostgreSQL + pgvector schema
-- Demo runtime uses the in-memory store (USE_IN_MEMORY_STORE=true).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TYPE user_role AS ENUM ('student', 'faculty', 'staff', 'super_admin');
CREATE TYPE policy_status AS ENUM ('active', 'superseded', 'under_review', 'draft', 'expired');
CREATE TYPE flag_status AS ENUM ('open', 'resolved');
CREATE TYPE conflict_status AS ENUM ('open', 'resolved');
CREATE TYPE authority_level AS ENUM ('university', 'department');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE circular_status AS ENUM ('active', 'withdrawn');
CREATE TYPE notification_severity AS ENUM ('critical', 'warning', 'info');
CREATE TYPE notification_event AS ENUM (
  'policy_updated',
  'circular_published',
  'conflict_detected',
  'ambiguity_spike',
  'clarification_request',
  'review_pending',
  'new_document'
);
CREATE TYPE clarification_status AS ENUM ('open', 'resolved');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  department TEXT,
  avatar_url TEXT,
  designation TEXT,
  employee_id TEXT,
  phone TEXT
);

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  version_year INTEGER NOT NULL,
  effective_date DATE NOT NULL,
  status policy_status NOT NULL DEFAULT 'under_review',
  source_file_url TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  authority_level authority_level NOT NULL DEFAULT 'university',
  department TEXT,
  audience user_role[] NOT NULL DEFAULT ARRAY['student','faculty','staff','super_admin']::user_role[],
  supersedes_id UUID REFERENCES policies(id)
);

CREATE TABLE policy_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  clause_number TEXT NOT NULL,
  clause_text TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'General',
  page_number INTEGER,
  embedding_vector vector(384)
);

CREATE TABLE circulars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  circular_number TEXT NOT NULL,
  issued_date DATE NOT NULL,
  description TEXT NOT NULL,
  status circular_status NOT NULL DEFAULT 'active',
  modifies_policy_id UUID REFERENCES policies(id),
  document_url TEXT
);

CREATE TABLE queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raised_by UUID NOT NULL REFERENCES users(id),
  policy_id UUID REFERENCES policies(id),
  query_id UUID REFERENCES queries(id),
  reason TEXT NOT NULL,
  status flag_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_a_id UUID NOT NULL REFERENCES policies(id),
  policy_b_id UUID NOT NULL REFERENCES policies(id),
  clause_a TEXT NOT NULL,
  clause_b TEXT NOT NULL,
  description TEXT NOT NULL,
  status conflict_status NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supersession_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_policy_id UUID NOT NULL REFERENCES policies(id),
  new_policy_id UUID NOT NULL REFERENCES policies(id),
  status review_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  role_targets user_role[] NOT NULL DEFAULT '{}',
  severity notification_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  event_type notification_event NOT NULL,
  policy_id UUID REFERENCES policies(id),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clarifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raised_by UUID NOT NULL REFERENCES users(id),
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  reason TEXT NOT NULL,
  status clarification_status NOT NULL DEFAULT 'open',
  assigned_roles user_role[] NOT NULL DEFAULT ARRAY['faculty','staff','super_admin']::user_role[],
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  policy_id UUID REFERENCES policies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
