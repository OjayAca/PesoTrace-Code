CREATE DATABASE IF NOT EXISTS pesotrace
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE pesotrace;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  preferred_theme ENUM('light', 'dark') NOT NULL DEFAULT 'light',
  default_budget DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PHP',
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_name_nonempty CHECK (CHAR_LENGTH(TRIM(name)) > 0),
  CONSTRAINT chk_users_default_budget_nonnegative CHECK (
    default_budget IS NULL OR default_budget >= 0
  ),
  CONSTRAINT chk_users_currency_php CHECK (currency = 'PHP')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(120) NOT NULL,
  notes TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  transaction_date DATE NOT NULL,
  type ENUM('expense', 'income') NOT NULL DEFAULT 'expense',
  category VARCHAR(40) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_transactions_user_date (user_id, transaction_date DESC),
  KEY idx_transactions_user_type (user_id, type),
  KEY idx_transactions_user_category (user_id, category),
  CONSTRAINT fk_transactions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT chk_transactions_title_nonempty CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_transactions_category_length CHECK (
    CHAR_LENGTH(TRIM(category)) BETWEEN 1 AND 40
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS budgets (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  month_key CHAR(7) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_budgets_user_month (user_id, month_key),
  CONSTRAINT fk_budgets_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT chk_budgets_month_key CHECK (month_key REGEXP '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT chk_budgets_amount_nonnegative CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS recurring_templates (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(120) NOT NULL,
  notes TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  start_date DATE NOT NULL,
  type ENUM('expense', 'income') NOT NULL DEFAULT 'expense',
  category VARCHAR(40) NOT NULL,
  repeat_cycle ENUM('monthly') NOT NULL DEFAULT 'monthly',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_recurring_templates_user_start (user_id, start_date),
  CONSTRAINT fk_recurring_templates_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT chk_recurring_templates_title_nonempty CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT chk_recurring_templates_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_recurring_templates_category_length CHECK (
    CHAR_LENGTH(TRIM(category)) BETWEEN 1 AND 40
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
