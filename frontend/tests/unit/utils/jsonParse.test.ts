import { JSONParse } from "../../../src/utils/jsonParse";

describe("JSONParse", () => {
  test("handles regular numbers", () => {
    const json = '{"small": 123}';
    expect(JSONParse(json)).toEqual({ small: 123 });
  });

  test("handles BigInt numbers", () => {
    const json = '{"big": 9008199254740991}';
    const expected = { big: BigInt("9008199254740991") };
    expect(JSONParse(json)).toEqual(expected);
  });

  test("handles nested BigInt", () => {
    const json = '{"data": {"id": 9007199254740991}}';
    expect(JSONParse(json)).toEqual({
      data: { id: Number(BigInt("9007199254740991")) },
    });
  });

  test("handles arrays with BigInt", () => {
    const json = '{"ids": [9007199254740991, 123]}';
    expect(JSONParse(json)).toEqual({
      ids: [Number(BigInt("9007199254740991")), 123],
    });
  });

  it("should parse regular JSON", () => {
    const input = '{"normal": 42}';
    expect(JSONParse(input)).toEqual({ normal: 42 });
  });

  it("should parse BigInt values correctly", () => {
    const input = '{"ids": [9007199254740991]}';
    const expected = { ids: [Number(BigInt("9007199254740991"))] };
    expect(JSONParse(input)).toEqual(expected);
  });

  it("should handle mixed array with BigInt and regular numbers", () => {
    const input = '{"ids": [9007199254740991, 123]}';
    const expected = { ids: [Number(BigInt("9007199254740991")), 123] };
    expect(JSONParse(input)).toEqual(expected);
  });

  it("should handle negative BigInt values", () => {
    const input = '{"value": -9007199254740991}';
    const expected = { value: Number(BigInt("-9007199254740991")) };
    expect(JSONParse(input)).toEqual(expected);
  });

  test("preserves the first unsafe positive and negative integers, including arrays", () => {
    expect(
      JSONParse(
        '{"id":9007199254740993,"ids":[9007199254740993,-9007199254740993]}',
      ),
    ).toEqual({
      id: 9007199254740993n,
      ids: [9007199254740993n, -9007199254740993n],
    });
  });

  test("does not rewrite numbers inside strings, decimals, or exponents", () => {
    const text =
      '{"name":"12345678901234567890 and \\"id\\": 12345678901234567890", "rating":12345678901234567.5,"other":12345678901234567e-5}';
    expect(JSONParse(text)).toEqual(JSON.parse(text));
  });

  test("keeps player names and strings that resemble integer placeholders", () => {
    expect(
      JSONParse(
        '{"name":"123n","marker":"__ggst_integer__0","id":9007199254740993}',
      ),
    ).toEqual({
      name: "123n",
      marker: "__ggst_integer__0",
      id: 9007199254740993n,
    });
  });

  test("also preserves Unicode-escaped placeholder-like names", () => {
    expect(
      JSONParse('{"name":"\\u005f_ggst_integer__0","id":9007199254740993}'),
    ).toEqual({
      name: "__ggst_integer__0",
      id: 9007199254740993n,
    });
  });
});
