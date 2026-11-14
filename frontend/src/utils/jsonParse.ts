/* global BigInt */
export const JSONParse = (
  text: string,
  reviver?: (key: string, value: unknown) => unknown,
) => {
  const integers = new Map<string, bigint>();
  const stringValues = new Set(
    Array.from(
      text.matchAll(/"(?:\\.|[^"\\])*"/g),
      ([token]) => JSON.parse(token) as string,
    ),
  );
  // Tokenize strings as well as numbers so quoted names/comments remain intact.
  // Unsafe integers also occur at 16 digits and inside arrays.
  const processed = text.replace(
    /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (token) => {
      if (/^-?\d+$/.test(token) && !Number.isSafeInteger(Number(token))) {
        let placeholder = `__ggst_integer__${integers.size}`;
        while (stringValues.has(placeholder)) placeholder = `_${placeholder}`;
        integers.set(placeholder, BigInt(token));
        return `"${placeholder}"`;
      }
      return token;
    },
  );

  return JSON.parse(processed, (key: string, value: unknown) => {
    const decoded =
      typeof value === "string" && integers.has(value)
        ? integers.get(value)
        : value;
    return reviver ? reviver(key, decoded) : decoded;
  });
};
