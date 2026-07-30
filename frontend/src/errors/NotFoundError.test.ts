import { describe, expect, test } from "vitest";
import { NotFoundError } from "./NotFoundError";

describe("NotFoundError", () => {
  test("is an instance of both Error and NotFoundError", () => {
    const error = new NotFoundError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
  });
});
