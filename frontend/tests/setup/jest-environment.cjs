const { TestEnvironment } = require("jest-environment-jsdom");

// Expose Node's Web APIs inside the jsdom global object. Production
// server helpers and browser component tests use fetch/Response/abort primitives.
const webApis = {
  fetch,
  Headers,
  Request,
  Response,
  AbortController,
  AbortSignal,
  TextEncoder,
  TextDecoder,
  structuredClone,
};

module.exports = class extends TestEnvironment {
  constructor(...args) {
    super(...args);
    Object.assign(this.global, webApis);
  }
};
