/* ───────────────────────────────────────────────────
 *  ErrorBoundary.jsx — Catch render errors at route level
 * ─────────────────────────────────────────────────── */
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack || "");
  }

  render() {
    if (this.state.hasError) {
      const t = this.props.t || ((k) => k);
      return (
        <div role="alert" style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100%",
          fontFamily: "var(--font-body)", color: "var(--text-muted)",
          padding: 40, gap: 12, textAlign: "center",
        }}>
          <div style={{ fontSize: "2rem", color: "var(--danger)", lineHeight: 1 }}>&#9762;</div>
          <div style={{ fontSize: "var(--font-lg)", color: "var(--text-primary)", fontWeight: 700 }}>
            {t("error_boundary_title")}
          </div>
          <div style={{ fontSize: "var(--font-sm)", maxWidth: 420, lineHeight: 1.5 }}>
            {t("error_boundary_desc")}
          </div>
          {this.state.error && (
            <div style={{
              fontSize: "var(--font-xxs)", color: "var(--text-dim)",
              background: "var(--bg-base)", padding: "8px 12px",
              maxWidth: 480, overflow: "auto",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              whiteSpace: "pre-wrap", wordBreak: "break-all",
              textAlign: "left", width: "100%",
            }}>
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 8, padding: "8px 18px",
              background: "var(--accent)", border: "none",
              borderRadius: "var(--radius-sm)",
              color: "var(--bg-deep)", cursor: "pointer",
              fontFamily: "var(--font-body)", fontSize: "var(--font-sm)",
              fontWeight: 600,
            }}
          >
            {t("error_boundary_retry")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
