-- Add unique constraint on bank_tx_id for expenses and incomes (avoid duplicate imports)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bank_tx_id VARCHAR(200);
ALTER TABLE incomes  ADD COLUMN IF NOT EXISTS bank_tx_id VARCHAR(200);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_bank_tx ON expenses(bank_tx_id) WHERE bank_tx_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_incomes_bank_tx  ON incomes(bank_tx_id)  WHERE bank_tx_id IS NOT NULL;

-- Add unique constraint on bank_accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_conn_acc ON bank_accounts(connection_id, account_id);

-- Add unique constraint on bank_connections per user/institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_conn_family_user_inst ON bank_connections(family_id, user_id, institution_id);
