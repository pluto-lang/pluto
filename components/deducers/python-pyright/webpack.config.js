const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const outPath = path.resolve(__dirname, "dist");
const typeshedFallback = path.resolve(__dirname, "libs", "pyright-internal", "typeshed-fallback");

module.exports = {
  entry: "./src/index.ts",
  target: "node",
  output: {
    path: outPath,
    filename: "bundle.js",
    library: {
      type: "umd",
    },
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
      },
      {
        test: /\.txt$/,
        use: "raw-loader",
      },
    ],
  },
  plugins: [new CopyPlugin({ patterns: [{ from: typeshedFallback, to: "typeshed-fallback" }] })],
};
