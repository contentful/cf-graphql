'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  statusCode: 200,
  headers: {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-cache'
  },
  body: fs.readFileSync(
    path.join(__dirname, 'graphiql.html'),
    {encoding: 'utf8'}
  )
};
