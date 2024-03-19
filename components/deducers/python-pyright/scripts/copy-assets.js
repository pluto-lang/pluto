const fs = require("fs-extra");
const path = require("path");

const assets = ["src/all_aws_lambda_modules_python3.10.txt"];

assets.forEach((asset) => {
  const dest = `dist/${asset.replace(/^src\//g, "")}`;
  fs.ensureDirSync(path.dirname(dest));
  fs.copySync(asset, dest);
});
