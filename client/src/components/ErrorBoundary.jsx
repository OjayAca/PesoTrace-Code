import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("PesoTrace UI error:", error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <section className="panel loading-panel" style={{ maxWidth: "32rem", margin: "2rem auto" }}>
            <p className="eyebrow">Something went wrong</p>
            <h1>The app hit an unexpected error</h1>
            <p className="hero-text">
              Try reloading the page. If the problem continues, clear the site data for this origin or
              contact support.
            </p>
            <button className="primary-button" type="button" onClick={this.handleReload}>
              Reload page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
