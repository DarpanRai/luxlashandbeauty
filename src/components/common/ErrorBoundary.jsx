import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import FullScreenError from "./FullScreenError.jsx";

// Catch-all for anything not covered by the offline/database-error checks in
// App.jsx — a genuine bug in a component's render, a bad third-party call, etc.
// React only catches these via a class component's getDerivedStateFromError /
// componentDidCatch; there's no hook equivalent.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error in app tree", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-root">
          <FullScreenError
            icon={AlertTriangle}
            title="Something went wrong"
            message="This page hit an unexpected error. Reloading usually fixes it — your data is safe in the database either way."
            actionLabel="Reload page"
            onAction={() => window.location.reload()}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
