'use strict';

// Dev server that uses the local module:
const cfGraphql = require('..');

// Shouldn't be versioned, can contain a CMA token
const config = require('./config.json');

const client = cfGraphql.createClient(config);

const express = require('express');
const graphqlHTTP = require('express-graphql');
const app = express();
const port = config.port || 4000;

client.getContentTypes()
.then(cfGraphql.prepareSpaceGraph)
.then(spaceGraph => {
  const names = spaceGraph.map(ct => ct.names.type).join(', ');
  console.log(`Contentful content types prepared: ${names}`);
  return spaceGraph;
})
.then(cfGraphql.createSchema)
.then(schema => {
  const ui = cfGraphql.helpers.graphiql({title: 'cf-graphql dev server'});
  app.get('/', (_, res) => res.set(ui.headers).status(ui.statusCode).end(ui.body));

  const opts = {version: true, timeline: true, detailedErrors: false};
  const ext = cfGraphql.helpers.expressGraphqlExtension(client, schema, opts);
  app.use('/graphql', graphqlHTTP(ext));

  app.listen(port);
  console.log(`Running a GraphQL server, listening on ${port}`);
})
.catch(err => {
  console.log(err);
  process.exit(1);
});
