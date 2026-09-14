-- Additive migration for all-or-nothing case-group scoring.
-- Existing submissions remain NULL and retain their historical per-testcase scores.
alter table submission add column if not exists scoring_version text;
