'use strict';

exports.graphql = function (e, ctx, cb) {
  const apollo = require('graphql-server-lambda');
  const entryLoader = require('./client.js').createEntryLoader();

  const handler = apollo.graphqlLambda({
    context: {entryLoader},
    schema: require('./schema.js')
  });

  handler(e, ctx, cb);
};

exports.ui = function (e, ctx, cb) {
  const fs = require('fs');
  const path = require('path');

  cb(null, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    },
    body: fs.readFileSync(
      path.join(__dirname, 'index.html'),
      {encoding: 'utf8'}
    )
  });
};
