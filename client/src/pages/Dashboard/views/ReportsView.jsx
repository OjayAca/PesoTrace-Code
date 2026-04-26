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
    <section className="report-page">
      <div className="section-heading report-toolbar">
        <div>
          <p className="eyebrow">
            <BarChart3 size={12} /> Monthly report
          </p>
          <h2>{monthLabel} reports</h2>
          <p className="report-toolbar-copy">
            Export this report to PDF from the browser dialog or print it directly.
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

      <section className="content-grid reports-grid">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <BarChart3 size={12} /> Trend
              </p>
              <h2>Monthly flow</h2>
            </div>
          </div>

          <div className="chart-list">
            {(reports?.monthlyTrend || []).map((item) => (
              <div className="chart-row" key={item.month}>
                <div className="chart-row-head">
                  <strong>{item.label}</strong>
                  <span>
                    Expense {formatCurrency(item.totalExpenses)} - Income{" "}
                    {formatCurrency(item.totalIncome)}
                  </span>
                </div>
                <div className="chart-bar-track">
                  <span
                    className="chart-bar-expense"
                    style={{
                      width: `${Math.max(
                        12,
                        (Number(item.totalExpenses || 0) / trendMaxExpense) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <div className="chart-row-foot">
                  <span>Net {formatCurrency(item.netBalance)}</span>
                  <span>Budget {formatCurrency(item.budget)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <PieChart size={12} /> Categories
              </p>
              <h2>Category breakdown</h2>
            </div>
          </div>

          {(reports?.categoryBreakdown || []).length === 0 ? (
            <div className="empty-inline">No category data for this month yet.</div>
          ) : (
            <div className="list-stack">
              {reports.categoryBreakdown.map((item) => (
                <div className="list-row list-row-compact" key={`${item.type}-${item.category}`}>
                  <div>
                    <strong>{item.category}</strong>
                    <p>{item.type}</p>
                  </div>
                  <strong
                    className={
                      item.type === "income" ? "amount-positive" : "amount-negative"
                    }
                  >
                    {item.type === "income" ? "+" : "-"}
                    {formatCurrency(item.amount)}
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
                <Activity size={12} /> Highlights
              </p>
              <h2>Monthly highlights</h2>
            </div>
          </div>
          <div className="insight-list">
            <div className="insight-item">
              <span>Largest expense</span>
              <strong>
                {reports?.highlights?.largestExpense
                  ? `${reports.highlights.largestExpense.title} - ${formatCurrency(
                    reports.highlights.largestExpense.amount,
                  )}`
                  : "No expense yet"}
              </strong>
            </div>
            <div className="insight-item">
              <span>Largest income</span>
              <strong>
                {reports?.highlights?.largestIncome
                  ? `${reports.highlights.largestIncome.title} - ${formatCurrency(
                    reports.highlights.largestIncome.amount,
                  )}`
                  : "No income yet"}
              </strong>
            </div>
            <div className="insight-item">
              <span>Top expense category</span>
              <strong>
                {reports?.highlights?.topExpenseCategory
                  ? `${reports.highlights.topExpenseCategory.category} - ${formatCurrency(
                    reports.highlights.topExpenseCategory.amount,
                  )}`
                  : "No expense category yet"}
              </strong>
            </div>
            <div className="insight-item">
              <span>Recurring templates</span>
              <strong>{reports?.highlights?.recurringTemplateCount || 0}</strong>
            </div>
            <div className="insight-item">
              <span>Expense change vs previous month</span>
              <strong>
                {reportComparisons
                  ? `${reportComparisons.expenseDelta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(reportComparisons.expenseDelta))}`
                  : "Not enough history"}
              </strong>
            </div>
            <div className="insight-item">
              <span>Income change vs previous month</span>
              <strong>
                {reportComparisons
                  ? `${reportComparisons.incomeDelta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(reportComparisons.incomeDelta))}`
                  : "Not enough history"}
              </strong>
            </div>
            <div className="insight-item">
              <span>Budget change vs previous month</span>
              <strong>
                {reportComparisons
                  ? `${reportComparisons.budgetDelta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(reportComparisons.budgetDelta))}`
                  : "Not enough history"}
              </strong>
            </div>
            <div className="insight-item">
              <span>Recurring load</span>
              <strong>
                {transactions.length
                  ? `${formatCurrency(recurringTotal)} from ${transactions.filter((transaction) => transaction.isRecurring).length} entries`
                  : "No recurring entries"}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
