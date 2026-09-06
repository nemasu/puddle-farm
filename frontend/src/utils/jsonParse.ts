/* global BigInt */
export const JSONParse = (text: string) => {
  const processed = text.replace(/([{,]\s*"[^"]*":\s*)(-?\d{17,})/g, '$1"$2n"');

  return JSON.parse(processed, (_key: string, value: unknown) => {
    if (typeof value === "string" && /^-?\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });
};
