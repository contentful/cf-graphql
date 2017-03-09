'use strict';

const fs = require('fs');
const path = require('path');

const server = require('graphql-server-lambda');

exports.graphql = server.graphqlLambda({
  schema: require('./schema.js')
});

exports.ui = function (e, ctx, cb) {
  cb(null, {
    statusCode: 200,
    headers: {'Content-Type': 'text/html'},
    body: fs.readFileSync(path.join(__dirname, 'index.html'), {encoding: 'utf8'})
  });
};
