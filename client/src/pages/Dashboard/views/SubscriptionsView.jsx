import { Repeat, Pencil, Trash2, X } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/formatters";

export function SubscriptionsView({
  monthLabel,
  subscriptionForm,
  setSubscriptionForm,
  handleSubscriptionSubmit,
  savingSubscription,
  subscriptions,
  handleEditSubscription,
  handleDeleteSubscription,
  resetSubscriptionForm,
  accounts,
  categories,
}) {
  const activeAccounts = accounts.filter((account) => !account.isArchived);

  return (
    <section className="workspace-grid">
      <div className="workspace-main">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Repeat size={12} /> Dedicated subscriptions
              </p>
              <h2>{subscriptionForm.id ? "Edit subscription" : "Add subscription"}</h2>
            </div>
            {subscriptionForm.id ? (
              <button className="secondary-button compact-button" type="button" onClick={resetSubscriptionForm}>
                <X size={14} /> Cancel edit
              </button>
            ) : null}
          </div>

          <form className="stack-form" onSubmit={handleSubscriptionSubmit}>
            <label>
              <div className="field-label">
                <span>Title</span>
                <small>Keep subscriptions separate from general recurring templates.</small>
              </div>
              <input
                type="text"
                value={subscriptionForm.title}
                onChange={(event) =>
                  setSubscriptionForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="form-row">
              <label>
                <div className="field-label">
                  <span>Amount</span>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={subscriptionForm.amount}
                  onChange={(event) =>
                    setSubscriptionForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                <div className="field-label">
                  <span>Start date</span>
                </div>
                <input
                  type="date"
                  value={subscriptionForm.startDate}
                  onChange={(event) =>
                    setSubscriptionForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                <div className="field-label">
                  <span>Source account</span>
                </div>
                <select
                  value={subscriptionForm.sourceAccountId}
                  onChange={(event) =>
                    setSubscriptionForm((current) => ({
                      ...current,
                      sourceAccountId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select account</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div className="field-label">
                  <span>Category</span>
                </div>
                <select
                  value={subscriptionForm.categoryId}
                  onChange={(event) =>
                    setSubscriptionForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <div className="field-label">
                <span>Notes</span>
              </div>
              <textarea
                rows="3"
                value={subscriptionForm.notes}
                onChange={(event) =>
                  setSubscriptionForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>

            <button className="primary-button" type="submit" disabled={savingSubscription}>
              {savingSubscription
                ? "Saving..."
                : subscriptionForm.id
                  ? "Update subscription"
                  : "Create subscription"}
            </button>
          </form>
        </article>
      </div>

      <div className="workspace-side">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Repeat size={12} /> Monthly subscriptions
              </p>
              <h2>{monthLabel} list</h2>
            </div>
          </div>

          <div className="list-stack">
            {subscriptions.length === 0 ? (
              <div className="empty-inline">No subscriptions yet.</div>
            ) : (
              subscriptions.map((subscription) => (
                <div className="list-row" key={subscription.id}>
                  <div>
                    <strong>{subscription.title}</strong>
                    <p>
                      Starts {formatDate(subscription.startDate)} - {subscription.category}
                    </p>
                  </div>
                  <div className="row-actions">
                    <strong>{formatCurrency(subscription.amount)}</strong>
                    <button className="icon-btn" type="button" onClick={() => handleEditSubscription(subscription)}>
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn danger" type="button" onClick={() => handleDeleteSubscription(subscription.id)}>
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
