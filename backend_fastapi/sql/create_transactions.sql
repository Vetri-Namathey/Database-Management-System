-- Run this in your Postgres database to create the transactions table

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  auction_id INTEGER REFERENCES auctions(id),
  player_id INTEGER REFERENCES players(id),
  amount DOUBLE PRECISION NOT NULL,
  type VARCHAR(32) NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now())
);

-- Optional index for quicker user lookups
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
