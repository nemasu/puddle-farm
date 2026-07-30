import Typography from "@mui/material/Typography";
import { Component, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { NotFoundError } from "../errors/NotFoundError";

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;

    if (error instanceof NotFoundError) {
      return <Navigate to="/" replace />;
    }

    if (error) {
      return (
        <Typography color="error" align="center" sx={{ mb: 2 }}>
          {error.message || "Could not connect to the API."}
        </Typography>
      );
    }

    return this.props.children;
  }
}
