import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bus,
  CalendarDays,
  Download,
  Moon,
  PiggyBank,
  ReceiptText,
  Repeat,
  ShieldCheck,
  Sun,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

const featureGroups = [
  {
    icon: Wallet,
    title: "Built for monthly control",
    copy:
      "Set a budget, record allowance or part-time income, and see whether the month is still on track.",
    points: ["Budget: PHP 12,000", "Income: PHP 10,500", "Remaining: PHP 3,150"],
  },
  {
    icon: ReceiptText,
    title: "Log what actually happens",
    copy:
      "Add expenses with categories, notes, dates, and reusable recurring entries for predictable costs.",
    points: ["Food and snacks", "Transport fares", "School supplies"],
  },
  {
    icon: BarChart3,
    title: "See the pattern",
    copy:
      "Review category totals, month-to-month movement, and reports you can print or export for planning.",
    points: ["Category totals", "Monthly trend", "PDF and print reports"],
  },
];

const transactions = [
  { icon: Utensils, title: "Lunch near campus", detail: "Food - today", amount: "-PHP 120" },
  { icon: Bus, title: "Jeepney and bus fare", detail: "Transport - recurring", amount: "-PHP 88" },
  { icon: BookOpen, title: "Lab manual printing", detail: "School - note saved", amount: "-PHP 240" },
  { icon: Wallet, title: "Weekly allowance", detail: "Income - Monday", amount: "+PHP 2,500" },
];

const categoryBreakdown = [
  { name: "Food", amount: "PHP 2,140", width: "70%" },
  { name: "Transport", amount: "PHP 1,320", width: "43%" },
  { name: "School", amount: "PHP 890", width: "30%" },
];

const steps = [
  {
    icon: PiggyBank,
    title: "Set the month",
    copy: "Enter a monthly budget and expected allowance or income.",
  },
  {
    icon: ReceiptText,
    title: "Add entries",
    copy: "Log expenses, notes, categories, and recurring templates.",
  },
  {
    icon: BarChart3,
    title: "Review reports",
    copy: "Check what changed before the next allowance cycle.",
  },
];

function DashboardMockup() {
  return (
    <aside className="landing-mockup" aria-label="PesoTrace dashboard preview">
      <div className="mockup-topbar">
        <div>
          <span>Monthly workspace</span>
          <strong>May 2026</strong>
        </div>
        <div className="mockup-status">
          <ShieldCheck size={14} />
          On track
        </div>
      </div>

      <div className="mockup-summary">
        <div>
          <span>Monthly budget</span>
          <strong>PHP 12,000</strong>
        </div>
        <div>
          <span>Total expenses</span>
          <strong>PHP 8,850</strong>
        </div>
        <div>
          <span>Income logged</span>
          <strong>PHP 10,500</strong>
        </div>
        <div className="mockup-balance">
          <span>Remaining</span>
          <strong>PHP 3,150</strong>
        </div>
      </div>

      <div className="mockup-progress">
        <div className="mockup-progress-head">
          <span>Budget used</span>
          <strong>74%</strong>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: "74%" }} />
        </div>
        <p>Food is close to limit, but transport and school costs are still within plan.</p>
      </div>

      <div className="mockup-grid">
        <section className="mockup-panel">
          <div className="mockup-panel-head">
            <span>Recent entries</span>
            <Repeat size={14} />
          </div>
          <div className="mockup-list">
            {transactions.map((transaction) => (
              <div className="mockup-row" key={transaction.title}>
                <div className="mockup-row-icon">
                  <transaction.icon size={15} />
                </div>
                <div>
                  <strong>{transaction.title}</strong>
                  <span>{transaction.detail}</span>
                </div>
                <b className={transaction.amount.startsWith("+") ? "amount-positive" : "amount-negative"}>
                  {transaction.amount}
                </b>
              </div>
            ))}
          </div>
        </section>

        <section className="mockup-panel">
          <div className="mockup-panel-head">
            <span>Category totals</span>
            <BarChart3 size={14} />
          </div>
          <div className="category-stack">
            {categoryBreakdown.map((category) => (
              <div className="category-meter" key={category.name}>
                <div>
                  <span>{category.name}</span>
                  <strong>{category.amount}</strong>
                </div>
                <div className="category-track" aria-hidden="true">
                  <span style={{ width: category.width }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export function LandingPage() {
  const { theme, setTheme } = useTheme(null);

  function handleThemeToggle() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <main className="app-shell landing-shell">
      <header className="landing-nav" aria-label="PesoTrace landing navigation">
        <Link className="nav-brand landing-brand" to="/">
          <div className="brand-mark small">PT</div>
          <span>PesoTrace</span>
        </Link>

        <div className="landing-nav-actions">
          <button
            className="icon-btn"
            type="button"
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link className="secondary-button compact-button" to="/auth">
            Sign in
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="hero-eyebrow">
            <Zap size={14} className="text-accent" /> Professional Finance Tracking
          </p>
          <h1 className="hero-title">Track every peso with clearer monthly control.</h1>
          <p className="landing-lede text-accent-light">
            PesoTrace helps students and beginners manage monthly budgets,
            allowance or income, everyday expenses, recurring entries, and
            readable reports in a professional, focused workspace.
          </p>

          <div className="landing-actions">
            <Link className="primary-button" to="/auth">
              Start tracking <ArrowRight size={16} />
            </Link>
            <Link className="secondary-button" to="/auth">
              Sign in
            </Link>
          </div>

          <div className="landing-tags" aria-label="PesoTrace benefits">
            <span>
              <ShieldCheck size={13} /> Secure workspace
            </span>
            <span>
              <Wallet size={13} /> Private account
            </span>
            <span>
              <CalendarDays size={13} /> Monthly budget view
            </span>
          </div>
        </div>

        <DashboardMockup />
      </section>

      <section className="landing-section" aria-labelledby="landing-control-title">
        <div className="landing-section-head">
          <p className="eyebrow">
            <PiggyBank size={14} /> Practical tracking
          </p>
          <h2 id="landing-control-title">Built around the way student money moves.</h2>
        </div>

        <div className="landing-feature-grid">
          {featureGroups.map((feature) => (
            <article className="landing-feature" key={feature.title}>
              <div className="metric-icon">
                <feature.icon size={18} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
              <div className="landing-chip-list">
                {feature.points.map((point) => (
                  <span key={point}>{point}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-workflow" aria-labelledby="landing-workflow-title">
        <div className="landing-section-head">
          <p className="eyebrow">
            <Repeat size={14} /> How it works
          </p>
          <h2 id="landing-workflow-title">Start with the next month, then keep it current.</h2>
        </div>

        <div className="landing-step-grid">
          {steps.map((step, index) => (
            <article className="landing-step" key={step.title}>
              <span className="landing-step-number">0{index + 1}</span>
              <div className="metric-icon">
                <step.icon size={18} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-report-band" aria-labelledby="landing-report-title">
        <div>
          <p className="eyebrow">
            <Download size={14} /> Reports when you need them
          </p>
          <h2 id="landing-report-title">Turn small daily entries into a monthly review.</h2>
        </div>
        <p>
          Compare categories, spot overspending early, and export a clear report
          before planning your next allowance, bills, and savings target.
        </p>
      </section>

      <section className="landing-final-cta" aria-labelledby="landing-final-title">
        <div>
          <p className="eyebrow">Ready for a cleaner budget?</p>
          <h2 id="landing-final-title">Create your PesoTrace account and start with this month.</h2>
        </div>
        <div className="landing-actions">
          <Link className="primary-button" to="/auth">
            Start tracking <ArrowRight size={16} />
          </Link>
          <Link className="secondary-button" to="/auth">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
