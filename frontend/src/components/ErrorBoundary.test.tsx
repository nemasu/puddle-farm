import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, test, vi } from "vitest";
import { NotFoundError } from "../errors/NotFoundError";
import { ErrorBoundary } from "./ErrorBoundary";

const ThrowingComponent = ({ error }: { error: Error }) => {
  throw error;
};

describe("ErrorBoundary", () => {
  test("renders children when there is no error", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <div>content</div>
        </ErrorBoundary>
      </MemoryRouter>,
    );

    screen.getByText("content");
  });

  test("redirects to home when a NotFoundError is thrown", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/top/SO"]}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route
            path="/top/:char_short"
            element={
              <ErrorBoundary>
                <ThrowingComponent error={new NotFoundError()} />
              </ErrorBoundary>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    screen.getByText("Home Page");

    consoleErrorSpy.mockRestore();
  });

  test("shows the error message when a generic Error is thrown", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ThrowingComponent error={new Error("server exploded")} />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    screen.getByText("server exploded");

    consoleErrorSpy.mockRestore();
  });

  test("falls back to a generic message when the error has no message", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ThrowingComponent error={new Error()} />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    screen.getByText("Could not connect to the API.");

    consoleErrorSpy.mockRestore();
  });

  test("resets the error state and renders children again once resetKey changes", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary resetKey="a">
          <ThrowingComponent error={new Error("boom")} />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    screen.getByText("boom");

    rerender(
      <MemoryRouter>
        <ErrorBoundary resetKey="b">
          <div>recovered</div>
        </ErrorBoundary>
      </MemoryRouter>,
    );

    screen.getByText("recovered");

    consoleErrorSpy.mockRestore();
  });

  test("keeps showing the error when resetKey is unchanged", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary resetKey="a">
          <ThrowingComponent error={new Error("boom")} />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    screen.getByText("boom");

    rerender(
      <MemoryRouter>
        <ErrorBoundary resetKey="a">
          <div>should not appear</div>
        </ErrorBoundary>
      </MemoryRouter>,
    );

    screen.getByText("boom");

    consoleErrorSpy.mockRestore();
  });
});
