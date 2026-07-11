import React from "react";

export default class VisualizationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem' }}>
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #f87171',
              color: '#b91c1c',
              padding: '1rem',
              borderRadius: '0.375rem',
              position: 'relative'
            }}
            role="alert"
          >
            <strong style={{ fontWeight: 'bold' }}>Visualization Error: </strong>
            <span style={{ display: 'block', fontSize: '0.875rem' }}>
              Failed to render visualization component.{" "}
              {this.state.error?.message || "Unknown error occurred."}
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}