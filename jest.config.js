/** @type {import('next/jest').Config} */
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "<rootDir>/jest.environment.js",
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/__tests__/e2e/",
    "<rootDir>/__tests__/setup.ts",
    "<rootDir>/__tests__/mocks/",
  ],
  transformIgnorePatterns: [
    "/node_modules/(?!next-auth|@auth|@aws-sdk|@smithy|uuid|@next-auth|@prisma|@jridgewell|@babel)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^next-auth/react$": "<rootDir>/__tests__/mocks/next-auth.ts",
    "^next-auth/providers/(.*)$": "<rootDir>/__tests__/mocks/next-auth.ts",
    "^next-auth$": "<rootDir>/__tests__/mocks/next-auth.ts",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
};

module.exports = createJestConfig(customJestConfig);
