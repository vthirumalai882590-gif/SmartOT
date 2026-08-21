// Explicit static require so Vercel static bundler (@vercel/nft) packages backend modules
const appModule = require('../backend/dist/backend/src/app');
const app = appModule.default || appModule;

module.exports = (req, res) => {
  return app(req, res);
};
