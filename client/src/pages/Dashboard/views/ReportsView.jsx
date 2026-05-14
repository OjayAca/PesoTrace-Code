import { BarChart3, PieChart, Activity } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

export function ReportsView({
  monthLabel,
  handleReportPdfExport,
  handleReportPrint,
  reports,
  trendMaxExpense,
  reportComparisons,
  transactions,
  recurringTotal
}) {
  return (
    <section className="report-page animate-fade-in">
      <div className="section-heading report-toolbar">
        <div>
          <p className="eyebrow">
            <BarChart3 size={12} /> Analytics
          </p>
          <h2>{monthLabel} Reports</h2>
          <p className="report-toolbar-copy">
            Detailed breakdown of your financial movement and trends.
          </p>
        </div>
        <div className="report-actions">
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={handleReportPdfExport}
          >
            Export PDF
          </button>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={handleReportPrint}
          >
            Print
          </button>
        </div>
      </div>

      <div className="bento-grid">
        <article className="bento-card span-8 row-3 animate-fade-up">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <BarChart3 size={12} /> Flow
              </p>
              <h3>Monthly Trend</h3>
            </div>
          </div>

          <div className="chart-list">
            {(reports?.monthlyTrend || []).map((item, index) => (
              <div className="chart-row animate-fade-in" key={item.month} style={{ animationDelay: `${0.1 + index * 0.05}s` }}>
                <div className="chart-row-head">
                  <strong style={{ fontWeight: 600 }}>{item.label}</strong>
                  <span className="mono" style={{ fontSize: '0.85rem' }}>
                    {formatCurrency(item.totalExpenses)} Expense
                  </span>
                </div>
                <div className="chart-bar-track">
                  <span
                    className="chart-bar-expense"
                    style={{
                      width: `${Math.max(
                        8,
                        (Number(item.totalExpenses || 0) / trendMaxExpense) * 100,
                      )}%`,
                      transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </div>
                <div className="chart-row-foot">
                  <span className="mono" style={{ fontSize: '0.75rem', opacity: 0.8 }}>Net {formatCurrency(item.netBalance)}</span>
                  <span className="mono" style={{ fontSize: '0.75rem', opacity: 0.8 }}>Budget {formatCurrency(item.budget)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="bento-card span-4 row-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <PieChart size={12} /> Distribution
              </p>
              <h3>Categories</h3>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            {(reports?.categoryBreakdown || []).length === 0 ? (
              <div className="empty-inline animate-fade-in">No category data yet.</div>
            ) : (
              <div className="bento-list">
                {reports.categoryBreakdown.map((item) => (
                  <div className="bento-list-item" key={`${item.type}-${item.category}`}>
                    <div className="item-info">
                      <span className="item-title">{item.category}</span>
                      <span className="item-meta" style={{ textTransform: 'capitalize' }}>{item.type}</span>
                    </div>
                    <span
                      className={`item-amount amount ${
                        item.type === "income" ? "amount-positive" : "amount-negative"
                      }`}
                    >
                      {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="bento-card span-12 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Activity size={12} /> Performance
              </p>
              <h3>Key Highlights</h3>
            </div>
          </div>
          <div className="insight-list">
            <div className="insight-item animate-scale-in" style={{ animationDelay: '0.3s' }}>
              <span>Largest expense</span>
              <strong className="mono">
                {reports?.highlights?.largestExpense
                  ? `${reports.highlights.largestExpense.title} (${formatCurrency(reports.highlights.largestExpense.amount)})`
                  : "—"}
              </strong>
            </div>
            <div className="insight-item animate-scale-in" style={{ animationDelay: '0.35s' }}>
              <span>Top category</span>
              <strong style={{ fontWeight: 600 }}>
                {reports?.highlights?.topExpenseCategory
                  ? reports.highlights.topExpenseCategory.category
                  : "—"}
              </strong>
            </div>
            <div className="insight-item animate-scale-in" style={{ animationDelay: '0.4s' }}>
              <span>Monthly Change</span>
              <strong className="mono">
                {reportComparisons
                  ? `${reportComparisons.expenseDelta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(reportComparisons.expenseDelta))}`
                  : "—"}
              </strong>
            </div>
            <div className="insight-item animate-scale-in" style={{ animationDelay: '0.45s' }}>
              <span>Recurring Load</span>
              <strong className="mono">{formatCurrency(recurringTotal)}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
