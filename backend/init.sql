CREATE TABLE IF NOT EXISTS meetings (
  id VARCHAR(255) PRIMARY KEY,
  client VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  company_info VARCHAR(255),
  market_operation TEXT,
  biggest_difficulty TEXT,
  problem_to_solve TEXT,
  how_can_we_help TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  created_at TIMESTAMP NOT NULL
);
