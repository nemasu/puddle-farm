import { useCallback, useState } from "react";

export function useResettableState<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const reset = useCallback(() => setState(initial), [initial]);
  return [state, setState, reset] as const;
}
