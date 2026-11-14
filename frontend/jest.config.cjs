const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: __dirname });

module.exports = createJestConfig({
  roots: ["<rootDir>/tests/unit"],
  testEnvironment: "<rootDir>/tests/setup/jest-environment.cjs",
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/unit/**/*.test.tsx",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
  coverageProvider: "v8",
  maxWorkers: 2,
});
