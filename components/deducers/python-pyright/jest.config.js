/*
 * jest.config.js
 *
 * Configuration for jest tests.
 */

module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src/test"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "es6",

          // Needed because jest calls tsc in a way that doesn't
          // inline const enums.
          preserveConstEnums: false,
        },
      },
    ],
    "\\.txt$": "<rootDir>/__mocks__/txtMock.js",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
};
