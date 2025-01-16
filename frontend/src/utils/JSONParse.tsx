/* global BigInt */
export const JSONParse = (text: string): any => {
  const processed = text.replace(
    /([{,]\s*"[^"]*":\s*)(-?\d{17,})/g,
    '$1"$2n"'
  );
  
  return JSON.parse(processed, (key: string, value: any) => {
    if (typeof value === 'string' && /^-?\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });
};