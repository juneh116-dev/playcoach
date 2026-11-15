BEGIN;
CREATE TABLE members (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL UNIQUE REFERENCES members(id),
  name text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('coach','facility')),
  bio text NOT NULL DEFAULT '',
  sports text[] NOT NULL,
  regions text[] NOT NULL,
  approved boolean NOT NULL DEFAULT false
);
CREATE TABLE feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL REFERENCES members(id),
  sport text NOT NULL,
  region text NOT NULL,
  concern text NOT NULL CHECK(length(trim(concern)) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  consent_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX requests_member_created ON feedback_requests(member_id,created_at DESC);
CREATE TABLE request_recipients (
  request_id uuid NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES coaches(id),
  PRIMARY KEY(request_id,coach_id)
);
CREATE INDEX recipients_coach ON request_recipients(coach_id);
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  body text NOT NULL CHECK(length(trim(body)) BETWEEN 20 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(request_id,coach_id) REFERENCES request_recipients(request_id,coach_id),
  UNIQUE(request_id,coach_id)
);
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL REFERENCES members(id),
  request_id uuid NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('new_request','new_feedback')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_member ON notifications(member_id,created_at DESC);
-- All data is accessed through authenticated server routes. No browser database access.
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
COMMIT;
