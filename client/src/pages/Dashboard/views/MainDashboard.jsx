import React from "react";
import { 
  CalendarDays, 
  Clock, 
  FileText, 
  Inbox, 
  Plus, 
  BarChart3, 
  AlertCircle, 
  Search, 
  Pencil, 
  TrendingUp,
  ArrowRight,
  Zap,
  Activity
} from "lucide-react";
import { getFirstName, formatCurrency, formatDate } from "../../../utils/formatters";

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
  metricCards,
  latestTransactions,
  dashboardSearch,
  setDashboardSearch,
  dashboardSearchResults,
  loadingDashboardSearch,
  handleEditTransaction,
  budgetAlert,
  setActiveView,
  handleStartNewTransaction,
  averageExpense,
  budgetPaceCopy
}) {
  const StatusIcon = statusMeta.icon;

  return (
    <div className="bento-grid">
      {/* ─── Hero Section ─── */}
      <section className="bento-card span-8 row-2 summary-bento-hero animate-fade-up">
        <div className="hero-content">
          <p className="hero-eyebrow"><CalendarDays size={14} /> Workspace</p>
          <h1>Hello, {getFirstName(user.name)}</h1>
          <p>You have {dashboard?.transactionCount || 0} entries for {monthLabel}.</p>
          
          <div className="summary-tags">
            <div className="summary-tag-item">
              <Clock size={16} opacity={0.7} />
              <span>
                {transactionInsights.latestTransactionDate
                  ? `Last entry: ${formatDate(transactionInsights.latestTransactionDate)}`
                  : "No recent activity"}
              </span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <BarChart3 size={120} opacity={0.1} />
        </div>
      </section>

      {/* ─── Budget Card ─── */}
      <section className={`bento-card span-4 row-2 bento-budget-card ${statusMeta.tone} animate-fade-up`} style={{ animationDelay: '0.1s' }}>
        <div className="status-pill">
          <StatusIcon size={14} /> {statusMeta.label}
        </div>
        <p className="metric-label">{budgetCardLabel}</p>
        <h2 className="mono">{budgetCardHeadline}</h2>
        <p className="metric-detail">{budgetCardCopy}</p>
        
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-caption">{statusMeta.description}</p>
      </section>

      {/* ─── Metric Cards ─── */}
      {metricCards.map((card, index) => (
        <article className="bento-card span-3 bento-stat-card animate-fade-up" key={card.label} style={{ animationDelay: `${0.15 + index * 0.05}s` }}>
          <div className="metric-icon">
            <card.icon size={24} />
          </div>
          <p className="metric-label">{card.label}</p>
          <h3 className="mono">{card.value}</h3>
          <p className="metric-detail">{card.detail}</p>
        </article>
      ))}

      {/* ─── Insights Section ─── */}
      <section className="bento-card span-4 row-2 animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <p className="eyebrow"><Zap size={12} /> Insights</p>
        <div className="insight-content">
          <p className="metric-label">Average Expense</p>
          <h3 className="mono">{averageExpense ? formatCurrency(averageExpense) : "N/A"}</h3>
          <p className="metric-detail">
            <Activity size={14} />
            {budgetPaceCopy}
          </p>
        </div>
      </section>

      {/* ─── Recent Activity ─── */}
      <section className="bento-card span-8 row-4 animate-fade-up" style={{ animationDelay: '0.35s' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow"><FileText size={12} /> Timeline</p>
            <h3>Recent Activity</h3>
          </div>
          <button 
            className="secondary-button compact-button"
            onClick={() => setActiveView("transactions")}
          >
            View All <ArrowRight size={14} />
          </button>
        </div>

        {latestTransactions.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <Inbox size={32} opacity={0.2} />
            <p>No transactions yet. Add your first entry to see insights.</p>
          </div>
        ) : (
          <div className="bento-list">
            {latestTransactions.map((t) => (
              <div className="bento-list-item" key={t.id}>
                <div className="item-info">
                  <div className="item-title">{t.title}</div>
                  <div className="item-meta">{formatDate(t.transactionDate)} • {t.category}</div>
                </div>
                <span className={`item-amount amount ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Search & Quick Actions ─── */}
      <section className="bento-card span-4 row-4">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><Search size={12} /> Explorer</p>
            <h3>Quick Search</h3>
          </div>
        </div>

        <div className="search-input-group">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search entries..." 
            value={dashboardSearch}
            onChange={(e) => setDashboardSearch(e.target.value)}
          />
        </div>

        {dashboardSearch.trim().length >= 2 && (
          <div className="bento-list search-results">
            {loadingDashboardSearch ? (
              <p className="metric-detail">Searching...</p>
            ) : dashboardSearchResults.length === 0 ? (
              <p className="metric-detail">No results found</p>
            ) : (
              dashboardSearchResults.map((t) => (
                <div className="bento-list-item compact" key={t.id}>
                  <div className="item-info">
                    <span className="item-title">{t.title}</span>
                    <span className="item-meta">{formatDate(t.transactionDate)}</span>
                  </div>
                  <div className="item-actions">
                    <span className={`item-amount amount ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`}>
                      {formatCurrency(t.amount)}
                    </span>
                    <button className="icon-btn" onClick={() => handleEditTransaction(t)}><Pencil size={12}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="quick-actions">
          <button 
            className="primary-button full-width" 
            onClick={() => handleStartNewTransaction()}
          >
            <Plus size={18} /> New Transaction
          </button>
        </div>
      </section>

      {/* ─── Budget Alerts ─── */}
      {budgetAlert && (
        <section className={`bento-card span-12 budget-alert budget-alert-${budgetAlert.tone}`}>
          <div className="alert-content">
            <AlertCircle size={24} />
            <div>
              <strong>{budgetAlert.title}</strong>
              <p>{budgetAlert.message}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
