USE pesotrace;

ALTER TABLE recurring_templates
  ADD COLUMN end_date DATE NULL AFTER start_date,
  ADD KEY idx_recurring_templates_user_end (user_id, end_date),
  ADD CONSTRAINT chk_recurring_templates_date_range CHECK (
    end_date IS NULL OR end_date >= start_date
  );
