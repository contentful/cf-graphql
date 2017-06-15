'use strict';

const path = require('path');
const cfGraphql = require('cf-graphql');
const express = require('express');
const cors = require('cors');
const graphqlHTTP = require('express-graphql');

const port = process.env.PORT || 4000;
const spaceId = process.env.SPACE_ID;
const cdaToken = process.env.CDA_TOKEN;
const cmaToken = process.env.CMA_TOKEN;

if (spaceId && cdaToken && cmaToken) {
  console.log('Space ID, CDA token and CMA token provided');
  console.log(`Fetching space (${spaceId}) content types to create a space graph`);
  useProvidedSpace();
} else {
  console.log('Using a demo space');
  console.log('You can provide env vars (see README.md) to use your own space');
  useDemoSpace();
}

// this function implements a flow you could use in your application:
// 1. fetch content types
// 2. prepare a space graph
// 3. create a schema out of the space graph
// 4. run a server
function useProvidedSpace () {
  const client = cfGraphql.createClient({spaceId, cdaToken, cmaToken});

  client.getContentTypes()
  .then(cfGraphql.prepareSpaceGraph)
  .then(spaceGraph => {
    const names = spaceGraph.map(ct => ct.names.type).join(', ');
    console.log(`Contentful content types prepared: ${names}`);
    return spaceGraph;
  })
  .then(cfGraphql.createSchema)
  .then(schema => startServer(client, schema))
  .catch(fail);
}

// this function is being run if you don't provide credentials to your own space
function useDemoSpace () {
  const {spaceId, cdaToken, spaceGraph} = require('./demo-data.json');
  const client = cfGraphql.createClient({spaceId, cdaToken});
  const schema = cfGraphql.createSchema(spaceGraph);
  startServer(client, schema);
}

function startServer (client, schema) {
  const app = express();
  app.use(cors());

  app.use('/client', express.static(path.join(__dirname, 'dist')));

  const ui = cfGraphql.helpers.graphiql({title: 'cf-graphql demo'});
  app.get('/', (_, res) => res.set(ui.headers).status(ui.statusCode).end(ui.body));

  const opts = {version: true, timeline: true, detailedErrors: false};
  const ext = cfGraphql.helpers.expressGraphqlExtension(client, schema, opts);
  app.use('/graphql', graphqlHTTP(ext));

  app.listen(port);
  console.log('Running a GraphQL server!');
  console.log(`You can access GraphiQL at localhost:${port}`);
  console.log(`You can use the GraphQL endpoint at localhost:${port}/graphql/`);
  console.log(`You can have a look at a React Frontend at localhost:${port}/client/`);
}

function fail (err) {
  console.log(err);
  process.exit(1);
}
