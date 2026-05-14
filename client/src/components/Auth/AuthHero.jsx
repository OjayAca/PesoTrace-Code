import React from "react";
import { Wallet, BarChart3, Repeat, ShieldCheck, Zap } from "lucide-react";

export function AuthHero() {
  return (
    <section className="auth-showcase">
      <div className="hero-copy">
        <div className="sidebar-logo auth-hero-logo">
          <Zap size={28} className="text-accent" />
          <span>PesoTrace</span>
        </div>
        <p className="eyebrow">
          <Wallet size={14} /> Professional Finance Control
        </p>
        <h1>
          Track every peso with clearer monthly control.
        </h1>
        <p className="hero-text">
          PesoTrace combines budgeting, transactions, and recurring entries in one focused, secure workspace.
        </p>
      </div>

      <div className="showcase-grid">
        <article className="showcase-card showcase-card-featured">
          <p className="card-kicker">Professional Workspace</p>
          <h2>Everything in one place.</h2>
          <p>
            Dashboard, transactions, reports, and settings. No more scattered notes or complex spreadsheets.
          </p>
        </article>

        <article className="showcase-card">
          <BarChart3 size={24} className="text-accent" />
          <h3>Clear Reports</h3>
          <p>See category totals and patterns effortlessly.</p>
        </article>

        <article className="showcase-card">
          <ShieldCheck size={24} className="text-accent" />
          <h3>Secure & Private</h3>
          <p>Your data is encrypted and stays under your control.</p>
        </article>
      </div>
    </section>
  );
}
