-- Additional hand-checked JHPIC coverage.
-- Safe to rerun: only the generated group is replaced.
BEGIN;

DELETE FROM testcase
WHERE (testcase_group LIKE 'Generated%' OR testcase_group LIKE 'Subtask%')
  AND problem_id IN ('q1', 'q2', 'q3', 'q4');

-- Q1: Portable Library
-- Each week is five days, each day is five subjects.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight) VALUES
('q1', $in$0 0
PED PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED$in$, $out$YES$out$, true, 'Generated', 1),
('q1', $in$12 8
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI$in$, $out$YES$out$, true, 'Generated', 1),
('q1', $in$11 8
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI$in$, $out$NO$out$, true, 'Generated', 1),
('q1', $in$11 8
MAA MAA MAA MAA MAA
MAA MAA MAA MAA MAA
MAA MAA MAA MAA MAA
MAA MAA MAA MAA MAA
MAA MAA MAA MAA MAA$in$, $out$YES$out$, true, 'Generated', 1),
('q1', $in$7 5
MAA MAA MAA MAA MAA
MAA MAA MAA MAA MAA
MAA MAA MAA MAA MAA
MAA MAA MAA MAA MAA
MAA MAA MAA MAA MAA$in$, $out$NO$out$, true, 'Generated', 1),
('q1', $in$3 5
DCT DCT DCT DCT DCT
DCT DCT DCT DCT DCT
DCT DCT DCT DCT DCT
DCT DCT DCT DCT DCT
DCT DCT DCT DCT DCT$in$, $out$YES$out$, true, 'Generated', 1),
('q1', $in$3 4
DCT DCT DCT DCT DCT
DCT DCT DCT DCT DCT
DCT DCT DCT DCT DCT
DCT DCT DCT DCT DCT
DCT DCT DCT DCT DCT$in$, $out$NO$out$, true, 'Generated', 1),
('q1', $in$3 3
ENG ENG ENG ENG ENG
ENG ENG ENG ENG ENG
ENG ENG ENG ENG ENG
ENG ENG ENG ENG ENG
ENG ENG ENG ENG ENG$in$, $out$YES$out$, true, 'Generated', 1),
('q1', $in$2 3
ENG ENG ENG ENG ENG
ENG ENG ENG ENG ENG
ENG ENG ENG ENG ENG
ENG ENG ENG ENG ENG
ENG ENG ENG ENG ENG$in$, $out$NO$out$, true, 'Generated', 1),
('q1', $in$30 26
SCI SOS MAA DCT ENG
MAS PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED$in$, $out$YES$out$, true, 'Generated', 1),
('q1', $in$29 26
SCI SOS MAA DCT ENG
MAS PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED$in$, $out$NO$out$, true, 'Generated', 1),
('q1', $in$-1 -1
SCI SOS MAA DCT ENG
MAS PED MAS DCT ENG
PED PED PED PED PED
SCI SCI SCI SCI SCI
MAA MAA MAA MAA MAA$in$, $out$YES$out$, true, 'Generated', 1);

-- Q2: Photos and Photons.
-- These cases deliberately use no openable folders/applications and L=0;
-- their total brightness equals Q, so the answer is unambiguously 100.00 0.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight) VALUES
('q2', $in$1 0 0 10
10


0$in$, $out$100.00 0$out$, true, 'Generated', 1),
('q2', $in$2 0 0 10
3 7


0$in$, $out$100.00 0$out$, true, 'Generated', 1),
('q2', $in$3 0 0 12
1 4 7


0$in$, $out$100.00 0$out$, true, 'Generated', 1),
('q2', $in$4 0 0 25
2 5 8 10


0$in$, $out$100.00 0$out$, true, 'Generated', 1),
('q2', $in$5 0 0 35
1 3 5 9 17


0$in$, $out$100.00 0$out$, true, 'Generated', 1),
('q2', $in$6 0 0 21
1 1 2 3 5 9


0$in$, $out$100.00 0$out$, true, 'Generated', 1),
('q2', $in$3 0 0 30
10 10 10


0$in$, $out$100.00 0$out$, true, 'Generated', 1),
('q2', $in$4 0 0 40
4 8 12 16


0$in$, $out$100.00 0$out$, true, 'Generated', 1);

-- Q3: Clutterfunk. Runs selected below form a minimum interval cover of 0..100.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight) VALUES
('q3', $in$6
P 12
P 9
F 20
R 15 55
R 50 80
R 75 100$in$, $out$9
75
20
15 55
4
20 15-55 50-80 75-100$out$, true, 'Generated', 1),
('q3', $in$5
P 20
F 40
R 30 70
R 70 100
P 25$in$, $out$20
70
40
30 70
3
40 30-70 70-100$out$, true, 'Generated', 1),
('q3', $in$4
P 4
R 0 100
R 10 30
F 20$in$, $out$4
0
100
0 100
1
0-100$out$, true, 'Generated', 1),
('q3', $in$5
P 8
F 25
R 20 60
R 55 90
R 80 100$in$, $out$8
80
25
20 60
4
25 20-60 55-90 80-100$out$, true, 'Generated', 1),
('q3', $in$5
P 11
R 0 30
R 20 80
R 75 100
P 14
F 10$in$, $out$11
75
30
20 80
3
0-30 20-80 75-100$out$, true, 'Generated', 1),
('q3', $in$6
P 6
F 10
F 30
F 100
R 20 50
R 50 90$in$, $out$6
100
100
0 100
1
100$out$, true, 'Generated', 1),
('q3', $in$6
P 13
R 5 25
F 35
R 30 65
R 60 85
R 80 100$in$, $out$13
80
35
30 65
4
35 30-65 60-85 80-100$out$, true, 'Generated', 1),
('q3', $in$4
P 3
R 0 40
R 35 75
R 70 100$in$, $out$3
70
40
0 40
3
0-40 35-75 70-100$out$, true, 'Generated', 1);

-- Q4: Absolute Tiredness. All high-capacity cases exercise shortest paths;
-- the constrained cases also cover rejection by an intermediate/destination cap.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight) VALUES
('q4', $in$1 4 5 4
1 2 5
2 4 5
1 3 2
3 4 10
1 4 20
100 100 100 100$in$, $out$10$out$, true, 'Generated', 1),
('q4', $in$1 5 4 5
1 2 4
2 3 7
3 4 1
4 5 2
100 100 100 100 100$in$, $out$14$out$, true, 'Generated', 1),
('q4', $in$1 2 1 2
1 2 10
100 5$in$, $out$-1$out$, true, 'Generated', 1),
('q4', $in$1 4 4 4
1 2 10
2 4 10
1 3 3
3 4 3
100 100 1 100$in$, $out$20$out$, true, 'Generated', 1),
('q4', $in$1 4 4 4
1 2 2
2 4 10
1 3 6
3 4 6
100 5 100 100$in$, $out$12$out$, true, 'Generated', 1),
('q4', $in$1 3 3 3
1 2 4
2 3 4
1 3 10
100 100 5$in$, $out$8$out$, true, 'Generated', 1),
('q4', $in$1 4 2 4
1 2 3
3 4 4
100 100 100 100$in$, $out$-1$out$, true, 'Generated', 1),
('q4', $in$1 2 3 2
1 2 3
1 2 9
1 1 100 100$in$, $out$3$out$, true, 'Generated', 1),
('q4', $in$2 5 5 5
2 3 2
3 4 2
4 5 2
1 5 20
2 5 7
100 100 100 100 100$in$, $out$6$out$, true, 'Generated', 1);

-- Explicit Q1 subtask coverage.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight) VALUES
('q1', $in$-1 0
PED PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED
PED PED PED PED PED$in$, $out$YES$out$, true, 'Subtask S=-1', 1),
('q1', $in$-1 7
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI
SCI SCI SCI SCI SCI$in$, $out$NO$out$, true, 'Subtask S=-1', 1),
('q1', $in$12 8
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED$in$, $out$YES$out$, true, 'Subtask same schedule', 1),
('q1', $in$27 21
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED$in$, $out$NO$out$, true, 'Subtask same schedule', 1),
('q1', $in$28 21
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED$in$, $out$YES$out$, true, 'Subtask no device', 1),
('q1', $in$27 21
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED
SCI MAS MAA ENG PED$in$, $out$NO$out$, true, 'Subtask no device', 1);

-- Q2: L=0 and equal-value subtask cases.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight) VALUES
('q2', $in$1 1 1 6
1
1
1
0$in$, $out$100.00 0$out$, true, 'Subtask equal values', 1),
('q2', $in$2 2 2 20
2 2
2 2
2 2
0$in$, $out$100.00 0$out$, true, 'Subtask equal values', 1),
('q2', $in$1 3 2 28
5
1 4 2
3 1
0$in$, $out$100.00 0$out$, true, 'Subtask general', 1);

-- Q2: X/Y/Z <= 200 boundary.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight)
VALUES (
  'q2',
  '200 0 0 200' || chr(10) || repeat('1 ', 199) || '1' || chr(10) || chr(10) || chr(10) || '0',
  '100.00 0', true, 'Subtask <=200', 1
);

-- Q3: all-practice and all-from-zero subtasks.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight) VALUES
('q3', $in$3
P 3
P 8
P 5$in$, $out$3
-1
-1
-1
-1$out$, true, 'Subtask all practice', 1),
('q3', $in$3
F 20
F 70
F 100$in$, $out$-1
100
100
0 100
1
100$out$, true, 'Subtask all from zero', 1),
('q3', $in$2
R 0 50
R 40 100$in$, $out$-1
40
50
0 50
2
0-50 40-100$out$, true, 'Subtask all runs', 1);

-- Q3: N=200 boundary.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight)
VALUES (
  'q3',
  repeat('P 1' || chr(10), 199) || 'F 100',
  '1' || chr(10) || '100' || chr(10) || '100' || chr(10) || '0 100' || chr(10) || '1' || chr(10) || '100',
  true, 'Subtask N<=200', 1
);

-- Q4: all-road-difficulty-one and Z=4 subtasks.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight) VALUES
('q4', $in$1 4 4 4
1 2 1
2 4 1
1 3 1
3 4 1
100 100 100 100$in$, $out$2$out$, true, 'Subtask roads=1', 1),
('q4', $in$1 4 3 4
1 2 4
2 4 4
1 4 10
100 100 100 100$in$, $out$8$out$, true, 'Subtask Z=4', 1);

-- Q4: N=100 and Z=200 boundary.
INSERT INTO testcase (problem_id, input, output, is_hidden, testcase_group, weight)
VALUES (
  'q4',
  '1 3 100 200' || chr(10) || repeat('1 2 1' || chr(10), 99) || '2 3 1' || chr(10) || repeat('200 ', 199) || '200',
  '2', true, 'Subtask N<=100 Z<=200', 1
);

COMMIT;
