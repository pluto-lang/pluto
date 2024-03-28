// Remove dependencies from package.json before publishing.
// This is because the dependencies are already bundled in the webpack output

const fs = require("fs");
const path = require("path");

const packagePath = path.join(__dirname, "..", "package.json");
const packageJson = require(packagePath);

delete packageJson.dependencies;

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
