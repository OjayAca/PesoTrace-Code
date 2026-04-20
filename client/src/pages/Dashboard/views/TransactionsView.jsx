import { Plus, Copy, X, Filter, Search, Inbox, Pencil, Trash2, Target, Repeat } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/formatters";

export function TransactionsView({
  monthLabel,
  transactionForm,
  latestManualTransaction,
  handleStartNewTransaction,
  resetTransactionForm,
  handleTransactionSubmit,
  setTransactionForm,
  savingTransaction,
  categories,
  handleEditTransaction,
  handleDeleteTransaction,
  handleDuplicateTransaction,
  clearTransactionFilters,
  filters,
  setFilters,
  loadingTransactions,
  transactions,
  budgetAmount,
  setBudgetAmount,
  handleBudgetSubmit,
  savingBudget,
  budgetTopUpAmount,
  setBudgetTopUpAmount,
  handleBudgetTopUp,
  recurringForm,
  resetRecurringForm,
  handleRecurringSubmit,
  setRecurringForm,
  savingRecurring,
  recurringTemplates,
  handleUseRecurringTemplate,
  handleEditRecurring,
  handleDeleteRecurring
}) {
  return (
    <section className="workspace-grid">
      <div className="workspace-main">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Plus size={12} /> Entry form
              </p>
              <h2>{transactionForm.id ? "Edit transaction" : "Add transaction"}</h2>
            </div>
            <div className="row-actions">
              {!transactionForm.id && latestManualTransaction ? (
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={() => handleStartNewTransaction(latestManualTransaction)}
                >
                  <Copy size={14} /> Use latest
                </button>
              ) : null}
              {transactionForm.id ? (
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={resetTransactionForm}
                >
                  <X size={14} /> Cancel edit
                </button>
              ) : null}
            </div>
          </div>

          <form className="stack-form" onSubmit={handleTransactionSubmit}>
            <label>
              <div className="field-label">
                <span>Title</span>
                <small>Use a clear label you can scan later.</small>
              </div>
              <input
                type="text"
                value={transactionForm.title}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Lunch, fare, school allowance"
                required
              />
            </label>

            <div className="form-row">
              <label>
                <div className="field-label">
                  <span>Type</span>
                  <small>Income or expense.</small>
                </div>
                <select
                  value={transactionForm.type}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>

              <label>
                <div className="field-label">
                  <span>Category</span>
                  <small>Group entries for reports.</small>
                </div>
                <select
                  value={transactionForm.category}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                <div className="field-label">
                  <span>Amount</span>
                  <small>Exact peso amount.</small>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  required
                />
              </label>

              <label>
                <div className="field-label">
                  <span>Date</span>
                  <small>When did this happen?</small>
                </div>
                <input
                  type="date"
                  value={transactionForm.transactionDate}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      transactionDate: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>

            <label>
              <div className="field-label">
                <span>Notes</span>
                <small>Optional context or reminder.</small>
              </div>
              <textarea
                rows="3"
                value={transactionForm.notes}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional details"
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={savingTransaction}
            >
              {savingTransaction
                ? "Saving..."
                : transactionForm.id
                  ? "Update transaction"
                  : "Add transaction"}
            </button>
          </form>
        </article>

        <article className="panel history-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Filter size={12} /> Filters and history
              </p>
              <h2>Transactions for {monthLabel}</h2>
            </div>
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={clearTransactionFilters}
            >
              Clear filters
            </button>
          </div>

          <div className="filter-grid">
            <label className="filter-field filter-search">
              <span>Search</span>
              <div className="input-with-icon">
                <Search size={15} />
                <input
                  type="search"
                  value={filters.query}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  placeholder="Title, note, category"
                />
              </div>
            </label>

            <label className="filter-field">
              <span>Type</span>
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                <option value="">All</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label className="filter-field">
              <span>Category</span>
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                <option value="">All</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>Start date</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    startDate: event.target.value,
                    }))
                }
              />
            </label>

            <label className="filter-field">
              <span>End date</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
              />
            </label>

            <label className="filter-field">
              <span>Sort by</span>
              <select
                value={filters.sortBy}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sortBy: event.target.value,
                  }))
                }
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="title">Title</option>
              </select>
            </label>

            <label className="filter-field">
              <span>Order</span>
              <select
                value={filters.sortOrder}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
          </div>

          {loadingTransactions ? (
            <div className="empty-state">
              <h3>Loading transactions...</h3>
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Inbox size={22} />
              </div>
              <h3>No matching transactions.</h3>
              <p>Try adjusting the filters or add your first entry for this month.</p>
            </div>
          ) : (
            <>
              <div className="table-wrap desktop-history">
                <table className="transaction-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Notes</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.transactionDate)}</td>
                        <td>
                          <div className="transaction-primary">
                            <strong>{transaction.title}</strong>
                            {transaction.isRecurring ? (
                              <span className="mini-badge">Recurring</span>
                            ) : null}
                          </div>
                        </td>
                        <td>{transaction.type}</td>
                        <td>{transaction.category}</td>
                        <td className="notes-cell">{transaction.notes || "-"}</td>
                        <td
                          className={
                            transaction.type === "income"
                              ? "amount-cell amount-positive"
                              : "amount-cell amount-negative"
                          }
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="action-cell">
                          <button
                            className="icon-btn"
                            type="button"
                            onClick={() => handleDuplicateTransaction(transaction)}
                            title="Duplicate"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            className="icon-btn"
                            type="button"
                            onClick={() => handleEditTransaction(transaction)}
                            title={transaction.isRecurring ? "Managed in recurring templates" : "Edit"}
                            aria-label={
                              transaction.isRecurring
                                ? "Recurring entries are managed in recurring templates"
                                : `Edit ${transaction.title}`
                            }
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-btn danger"
                            type="button"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            title="Delete"
                            disabled={transaction.isRecurring}
                            aria-label={`Delete ${transaction.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-history">
                {transactions.map((transaction) => (
                  <article className="mobile-transaction-card" key={transaction.id}>
                    <div className="mobile-transaction-head">
                      <div>
                        <p className="mobile-transaction-title">{transaction.title}</p>
                        <span>
                          {formatDate(transaction.transactionDate)} - {transaction.category}
                        </span>
                      </div>
                      <strong
                        className={
                          transaction.type === "income"
                            ? "amount-cell amount-positive"
                            : "amount-cell amount-negative"
                        }
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </strong>
                    </div>
                    <p className="mobile-transaction-notes">
                      {transaction.notes || "No notes added"}
                    </p>
                    <div className="mobile-transaction-actions">
                      <button
                        className="action-button"
                        type="button"
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        className="action-button danger"
                        type="button"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        disabled={transaction.isRecurring}
                        aria-label={`Delete ${transaction.title}`}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </article>
      </div>

      <div className="workspace-side">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Target size={12} /> Budget
              </p>
              <h2>Budget for {monthLabel}</h2>
            </div>
          </div>

          <form className="stack-form" onSubmit={handleBudgetSubmit}>
            <label>
              <div className="field-label">
                <span>Monthly budget</span>
                <small>Saving replaces the budget for this month.</small>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budgetAmount}
                onChange={(event) => setBudgetAmount(event.target.value)}
                placeholder="Enter monthly budget"
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={savingBudget}>
              {savingBudget ? "Saving..." : "Save budget"}
            </button>
          </form>

          <form className="stack-form" onSubmit={handleBudgetTopUp}>
            <label>
              <div className="field-label">
                <span>Add to budget</span>
                <small>Adds the entered amount to the current month total.</small>
              </div>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={budgetTopUpAmount}
                onChange={(event) => setBudgetTopUpAmount(event.target.value)}
                placeholder="Enter top-up amount"
                required
              />
            </label>
            <button className="secondary-button" type="submit" disabled={savingBudget}>
              {savingBudget ? "Adding..." : "Add to budget"}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Repeat size={12} /> Recurring
              </p>
              <h2>{recurringForm.id ? "Edit recurring entry" : "Recurring templates"}</h2>
            </div>
            {recurringForm.id ? (
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={resetRecurringForm}
              >
                <X size={14} /> Cancel edit
              </button>
            ) : null}
          </div>

          <form className="stack-form" onSubmit={handleRecurringSubmit}>
            <label>
              <div className="field-label">
                <span>Title</span>
                <small>Auto-generated monthly from the start date.</small>
              </div>
              <input
                type="text"
                value={recurringForm.title}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Allowance, rent, internet"
                required
              />
            </label>

            <div className="form-row">
              <label>
                <div className="field-label">
                  <span>Type</span>
                  <small>Income or expense.</small>
                </div>
                <select
                  value={recurringForm.type}
                  onChange={(event) =>
                    setRecurringForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <label>
                <div className="field-label">
                  <span>Category</span>
                  <small>Used in reports.</small>
                </div>
                <select
                  value={recurringForm.category}
                  onChange={(event) =>
                    setRecurringForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                <div className="field-label">
                  <span>Amount</span>
                  <small>Peso amount every month.</small>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={recurringForm.amount}
                  onChange={(event) =>
                    setRecurringForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  required
                />
              </label>
              <label>
                <div className="field-label">
                  <span>Start date</span>
                  <small>First month this applies.</small>
                </div>
                <input
                  type="date"
                  value={recurringForm.startDate}
                  onChange={(event) =>
                    setRecurringForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>

            <label>
              <div className="field-label">
                <span>Notes</span>
                <small>Optional reminder or explanation.</small>
              </div>
              <textarea
                rows="2"
                value={recurringForm.notes}
                onChange={(event) =>
                  setRecurringForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional details"
              />
            </label>

            <button className="primary-button" type="submit" disabled={savingRecurring}>
              {savingRecurring
                ? "Saving..."
                : recurringForm.id
                  ? "Update recurring template"
                  : "Create recurring template"}
            </button>
          </form>

          <div className="list-stack recurring-list">
            {recurringTemplates.length === 0 ? (
              <div className="empty-inline">No recurring templates yet.</div>
            ) : (
              recurringTemplates.map((template) => (
                <div className="list-row list-row-compact" key={template.id}>
                  <div>
                    <strong>{template.title}</strong>
                    <p>
                      Starts {formatDate(template.startDate)} - {template.type} -{" "}
                      {template.category}
                    </p>
                  </div>
                  <div className="row-actions">
                    <strong
                      className={
                        template.type === "income" ? "amount-positive" : "amount-negative"
                      }
                    >
                      {template.type === "income" ? "+" : "-"}
                      {formatCurrency(template.amount)}
                    </strong>
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => handleUseRecurringTemplate(template)}
                      title="Use template"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => handleEditRecurring(template)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-btn danger"
                      type="button"
                      onClick={() => handleDeleteRecurring(template.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
