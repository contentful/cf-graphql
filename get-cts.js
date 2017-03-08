'use strict';

const fs = require('fs');
const path = require('path');

require('./client.js').getContentTypes().then(cts => {
  fs.writeFile(
    path.join(__dirname, 'cts.json'),
    JSON.stringify(cts, null, 2)
  );

  console.log('Saved', cts.map(ct => ct.name).join(', '));
});
