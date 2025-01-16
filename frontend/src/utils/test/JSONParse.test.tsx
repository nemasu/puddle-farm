import { JSONParse } from '../JSONParse';

describe('JSONParse', () => {
  test('handles regular numbers', () => {
    const json = '{"small": 123}';
    expect(JSONParse(json)).toEqual({ small: 123 });
  });

  test('handles BigInt numbers', () => {
    const json = '{"big": 9008199254740991}';
    const expected = { big: Number(BigInt("9008199254740991")) };
    expect(JSONParse(json)).toEqual(expected);
  });

  test('handles nested BigInt', () => {
    const json = '{"data": {"id": 9007199254740991}}';
    expect(JSONParse(json)).toEqual({ data: { id: Number(BigInt("9007199254740991")) } });
  });

  test('handles arrays with BigInt', () => {
    const json = '{"ids": [9007199254740991, 123]}';
    expect(JSONParse(json)).toEqual({ ids: [Number(BigInt("9007199254740991")), 123] });
  });

  it('should parse regular JSON', () => {
    const input = '{"normal": 42}';
    expect(JSONParse(input)).toEqual({ normal: 42 });
  });

  it('should parse BigInt values correctly', () => {
    const input = '{"ids": [9007199254740991]}';
    const expected = { ids: [Number(BigInt('9007199254740991'))] };
    expect(JSONParse(input)).toEqual(expected);
  });

  it('should handle mixed array with BigInt and regular numbers', () => {
    const input = '{"ids": [9007199254740991, 123]}';
    const expected = { ids: [Number(BigInt('9007199254740991')), 123] };
    expect(JSONParse(input)).toEqual(expected);
  });

  it('should handle negative BigInt values', () => {
    const input = '{"value": -9007199254740991}';
    const expected = { value: Number(BigInt('-9007199254740991')) };
    expect(JSONParse(input)).toEqual(expected);
  });
});