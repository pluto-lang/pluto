const fs = require("fs-extra");
const path = require("path");

// iterate the src recursively and copy the non-ts files to dist
function copyAssets(src, dest) {
  const files = fs.readdirSync(src);
  files.forEach((file) => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      fs.ensureDirSync(destPath);
      copyAssets(srcPath, destPath);
    } else if (path.extname(file) !== ".ts") {
      fs.copySync(srcPath, destPath);
    }
  });
}

copyAssets("src", "dist");
