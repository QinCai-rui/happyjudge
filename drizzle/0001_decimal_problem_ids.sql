BEGIN;

CREATE SEQUENCE IF NOT EXISTS problem_id_seq;

CREATE TEMP TABLE problem_id_map (
  old_id text PRIMARY KEY,
  new_id integer NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO problem_id_map (old_id, new_id)
SELECT id, row_number() OVER (ORDER BY created_at, id)::integer
FROM problem;

ALTER TABLE testcase DROP CONSTRAINT testcase_problem_id_problem_id_fk;
ALTER TABLE submission DROP CONSTRAINT submission_problem_id_problem_id_fk;
ALTER TABLE contest_problem DROP CONSTRAINT contest_problem_contest_id_problem_id_pk;
ALTER TABLE contest_problem DROP CONSTRAINT contest_problem_problem_id_problem_id_fk;

UPDATE testcase AS t
SET problem_id = m.new_id::text
FROM problem_id_map AS m
WHERE t.problem_id = m.old_id;

UPDATE submission AS s
SET problem_id = m.new_id::text
FROM problem_id_map AS m
WHERE s.problem_id = m.old_id;

UPDATE contest_problem AS cp
SET problem_id = m.new_id::text
FROM problem_id_map AS m
WHERE cp.problem_id = m.old_id;

UPDATE problem AS p
SET id = m.new_id::text
FROM problem_id_map AS m
WHERE p.id = m.old_id;

ALTER TABLE problem ALTER COLUMN id SET DEFAULT nextval('problem_id_seq')::text;

SELECT setval('problem_id_seq', COALESCE(MAX(new_id), 1), COUNT(*) > 0)
FROM problem_id_map;

ALTER TABLE testcase
  ADD CONSTRAINT testcase_problem_id_problem_id_fk
  FOREIGN KEY (problem_id) REFERENCES problem(id) ON DELETE CASCADE;
ALTER TABLE submission
  ADD CONSTRAINT submission_problem_id_problem_id_fk
  FOREIGN KEY (problem_id) REFERENCES problem(id);
ALTER TABLE contest_problem
  ADD CONSTRAINT contest_problem_problem_id_problem_id_fk
  FOREIGN KEY (problem_id) REFERENCES problem(id) ON DELETE CASCADE;
ALTER TABLE contest_problem
  ADD CONSTRAINT contest_problem_contest_id_problem_id_pk
  PRIMARY KEY (contest_id, problem_id);

COMMIT;
