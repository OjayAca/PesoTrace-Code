import { Wallet, BarChart3, Repeat } from "lucide-react";

export function AuthHero() {
  return (
    <section className="auth-showcase">
      <div className="hero-copy">
        <div className="brand-mark">PT</div>
        <p className="eyebrow">
          <Wallet size={14} /> Personal finance tracker
        </p>
        <h1>Track every peso with clearer monthly control.</h1>
        <p className="hero-text">
          PesoTrace combines budgeting, transactions, recurring entries, reports,
          and account settings in one focused workspace.
        </p>
      </div>

      <div className="showcase-grid">
        <article className="showcase-card showcase-card-featured">
          <p className="card-kicker">Upgraded workspace</p>
          <h2>Dashboard, transactions, reports, and settings.</h2>
          <p>
            Keep monthly budgets, cash flow, categories, and recurring entries in
            one application instead of scattered notes.
          </p>
        </article>

        <article className="showcase-card">
          <BarChart3 size={20} />
          <h3>Readable reports</h3>
          <p>See category totals and month-to-month patterns without extra tools.</p>
        </article>

        <article className="showcase-card">
          <Repeat size={20} />
          <h3>Recurring tracking</h3>
          <p>Reuse monthly allowance or bill entries instead of typing them again.</p>
        </article>
      </div>
    </section>
  );
}
