/**
 * ErrorBoundary — catches render-time errors so RICIPT never shows a blank
 * page. Shows the error message (so it can be reported/diagnosed) instead of
 * unmounting the whole app. The last error is also mirrored to localStorage
 * so support can inspect it later.
 */
import { Component } from 'react';

const KEY = 'ricipt:last-error';

function persistError(error) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        at: new Date().toISOString(),
        name: error?.name || 'Error',
        message: error?.message || String(error),
        stack: error?.stack || '',
      })
    );
  } catch {
    /* ignore */
  }
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[RICIPT] Render crash caught by ErrorBoundary:', error, info);
    persistError(error);
  }

  handleReload = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { error } = this.state;
    return (
      <div className="page">
        <div className="gate">
          <h2 className="gate__title">SOMETHING WENT WRONG</h2>
          <p className="gate__text">
            RICIPT hit an unexpected error while rendering this page. Reloading usually fixes it.
          </p>
          <p className="gate__error mono">{error.message || String(error)}</p>
          <div className="gate__actions">
            <button type="button" className="btn btn--primary" onClick={this.handleReload}>
              RELOAD PAGE
            </button>
            <a href="/" className="btn btn--ghost">
              GO HOME
            </a>
          </div>
        </div>
      </div>
    );
  }
}