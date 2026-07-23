import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useResettableState } from "./useResettableState";

describe("useResettableState", () => {
  test("returns the initial value", () => {
    const { result } = renderHook(() => useResettableState({ count: 0 }));
    expect(result.current[0]).toEqual({ count: 0 });
  });

  test("updates the value via setState", () => {
    const { result } = renderHook(() => useResettableState({ count: 0 }));
    act(() => {
      result.current[1]({ count: 5 });
    });
    expect(result.current[0]).toEqual({ count: 5 });
  });

  test("resets back to the initial value", () => {
    const { result } = renderHook(() => useResettableState({ count: 0 }));
    act(() => {
      result.current[1]({ count: 5 });
    });
    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toEqual({ count: 0 });
  });
});
