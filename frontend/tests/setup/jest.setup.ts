import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
});
