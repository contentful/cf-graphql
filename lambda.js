'use strict';

exports.graphql = function (e, ctx, cb) {
  const apollo = require('graphql-server-lambda');
  const entryLoader = require('./src/client.js').createEntryLoader();

  const handler = apollo.graphqlLambda({
    context: {entryLoader},
    schema: require('./src/schema.js')
  });

  handler(e, ctx, cb);
};

exports.ui = function (e, ctx, cb) {
  cb(null, require('./src/graphiql.js'));
};
