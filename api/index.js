const path = require('path');
const fs = require('fs');

let appModule;
const possiblePaths = [
  path.resolve(__dirname, '../backend/dist/backend/src/app.js'),
  path.resolve(__dirname, '../backend/dist/src/app.js'),
  path.resolve(__dirname, '../backend/dist/app.js'),
];

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    appModule = require(p);
    break;
  }
}

if (!appModule) {
  try {
    appModule = require('../backend/dist/backend/src/app');
  } catch (e) {
    appModule = require('../backend/dist/app');
  }
}

const app = (appModule && appModule.default) || appModule;

module.exports = (req, res) => {
  return app(req, res);
};
