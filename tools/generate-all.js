const fs = require('node:fs');
const path = require('node:path');

fs.readdirSync(__dirname, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(__dirname, entry.name, 'generate-tests.js')))
  .forEach((entry) => {
    require(path.join(__dirname, entry.name, 'generate-tests.js'));
  });

require('./build-manifest');
