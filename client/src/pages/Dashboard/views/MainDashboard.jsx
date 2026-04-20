import { CalendarDays, Hash, Clock, Wallet, TrendingDown, TrendingUp, PieChart, FileText, Inbox, Target, CheckCircle2, Plus, BarChart3, ShieldCheck, Activity, AlertCircle } from "lucide-react";
import { getFirstName, formatCurrency, formatDate } from "../../../utils/formatters";
import { getStatusMeta } from "../../../utils/helpers";

export function MainDashboard({
  user,
  monthLabel,
  dashboard,
  transactionInsights,
  statusMeta,
  budgetCardLabel,
  budgetCardHeadline,
  budgetCardCopy,
  progress,
  budgetPaceCopy,
  metricCards,
  latestTransactions,
  setActiveView,
  averageExpense,
  onboardingComplete,
  checklistDismissed,
  dismissOnboardingChecklist,
  onboardingChecklist,
  onboardingProgress,
  handleStartNewTransaction
}) {
  const StatusIcon = statusMeta.icon;

  return (
    <>
      <section className="summary-hero panel panel-hero">
        <div className="summary-copy">
          <p className="eyebrow">
            <CalendarDays size={14} /> Monthly finance workspace
          </p>
          <h1>Welcome back, {getFirstName(user.name)}.</h1>
          <p className="summary-text">
            Review your budget, income, expenses, and recurring activity for{" "}
            {monthLabel} in one place.
          </p>

          <div className="summary-tags">
            <span>
              <Hash size={13} /> {dashboard?.transactionCount || 0} entries
            </span>
            <span>
              <Clock size={13} />{" "}
              {transactionInsights.latestTransactionDate
                ? `Latest: ${formatDate(transactionInsights.latestTransactionDate)}`
                : "No recent entries"}
            </span>
            <span>
              <StatusIcon size={13} /> {statusMeta.label}
            </span>
          </div>
        </div>

        <article className={`summary-card ${statusMeta.tone}`}>
          <div className="status-pill">
            <StatusIcon size={13} /> {statusMeta.label}
          </div>
          <p className="summary-card-label">{budgetCardLabel}</p>
          <h2>{budgetCardHeadline}</h2>
          <p className="summary-card-copy">{budgetCardCopy}</p>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-caption">{statusMeta.description}</p>
          <p className="progress-caption">{budgetPaceCopy}</p>
        </article>
      </section>

      <section className="metric-grid">
        {metricCards.map((card) => (
          <article className="panel metric-card" key={card.label}>
            <div>
              <div className="metric-icon">
                <card.icon size={18} />
              </div>
              <p className="metric-label">{card.label}</p>
              <h3>{card.value}</h3>
            </div>
            <p className="metric-detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <FileText size={12} /> Latest entries
              </p>
              <h2>Recent activity</h2>
            </div>
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={() => setActiveView("transactions")}
            >
              Open transactions
            </button>
          </div>

          {latestTransactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Inbox size={22} />
              </div>
              <h3>No entries yet.</h3>
              <p>Add a transaction or recurring template to start building your summary.</p>
            </div>
          ) : (
            <div className="list-stack">
              {latestTransactions.map((transaction) => (
                <div className="list-row" key={transaction.id}>
                  <div>
                    <strong>{transaction.title}</strong>
                    <p>
                      {formatDate(transaction.transactionDate)} - {transaction.category} -{" "}
                      {transaction.type}
                      {transaction.isRecurring ? " - recurring" : ""}
                    </p>
                  </div>
                  <strong
                    className={
                      transaction.type === "income" ? "amount-positive" : "amount-negative"
                    }
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <BarChart3 size={12} /> Quick signals
              </p>
              <h2>At a glance</h2>
            </div>
          </div>
          <div className="insight-list">
            <div className="insight-item">
              <span>Largest expense</span>
              <strong>
                {transactionInsights.largestExpense === null
                  ? "No data yet"
                  : formatCurrency(transactionInsights.largestExpense)}
              </strong>
            </div>
            <div className="insight-item">
              <span>Income entries</span>
              <strong>{transactionInsights.incomeCount}</strong>
            </div>
            <div className="insight-item">
              <span>Recurring entries this month</span>
              <strong>{transactionInsights.recurringCount}</strong>
            </div>
            <div className="insight-item">
              <span>Average expense</span>
              <strong>
                {averageExpense === null ? "No data yet" : formatCurrency(averageExpense)}
              </strong>
            </div>
          </div>
        </article>

        {!onboardingComplete && !checklistDismissed ? (
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <Target size={12} /> Getting started
                </p>
                <h2>Finish the setup</h2>
              </div>
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={dismissOnboardingChecklist}
              >
                Hide
              </button>
            </div>

            <div className="insight-list onboarding-list">
              {onboardingChecklist.map((item) => (
                <div className="insight-item" key={item.id}>
                  <span className="check-item-copy">
                    <CheckCircle2 size={14} className={item.complete ? "check-item-complete" : ""} />
                    {item.label}
                  </span>
                  <strong>{item.complete ? "Done" : "Next"}</strong>
                </div>
              ))}
            </div>
            <p className="section-caption">
              Progress {onboardingProgress}/{onboardingChecklist.length} complete.
            </p>

            <div className="button-row">
              <button className="primary-button" type="button" onClick={handleStartNewTransaction}>
                <Plus size={16} /> New transaction
              </button>
              <button className="secondary-button" type="button" onClick={() => setActiveView("reports")}>
                Open reports
              </button>
            </div>
            <p className="section-caption">
              Shortcuts: Ctrl+Alt+N new transaction, Ctrl+Alt+R reports, Ctrl+Alt+S settings.
            </p>
          </article>
        ) : null}
      </section>
    </>
  );
}
