-- Strengthen liquidity scoring rule penalties
UPDATE scoring_rules SET points = -25 WHERE key = 'AVG_BALANCE_BELOW_HALF_RENT';
UPDATE scoring_rules SET points = -20 WHERE key = 'LOW_BALANCE_1_2_MONTHS';
UPDATE scoring_rules SET points = -35 WHERE key = 'LOW_BALANCE_3_PLUS_MONTHS';
UPDATE scoring_rules SET points = -25 WHERE key = 'OVERDRAFT_3_PLUS_TIMES';
