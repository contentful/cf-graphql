'use strict';

// requiring a local module; outside of this repo you should require "cf-graphql"
const cfGraphql = require('..');

const express = require('express');
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
  // const SPACE_ID = 'f9gzm4p998uo';
  // const CDA_TOKEN = '7563852245db5888c3c7e13afb90686b8b921ef3271d9e8cf28f468e5d122889';
  throw new Error('Demo not implemented yet');
}

function startServer (client, schema) {
  const app = express();
  const ui = cfGraphql.createUI(`http://localhost:${port}/graphql`);

  app.get('/', (_, res) => res.set(ui.headers).status(ui.statusCode).end(ui.body));

  app.use('/graphql', graphqlHTTP(() => {
    const start = Date.now();
    const entryLoader = client.createEntryLoader();

    return {
      context: {entryLoader},
      schema,
      graphiql: false,
      // timeline extension and detailed errors are nice for development, but
      // most likely you want to skip them in your production setup
      extensions: () => ({
        time: Date.now()-start,
        timeline: entryLoader.getTimeline().map(httpCall => {
          return Object.assign({}, httpCall, {start: httpCall.start-start});
        })
      }),
      formatError: error => ({
        message: error.message,
        locations: error.locations,
        stack: error.stack
      })
    };
  }));

  app.listen(port);
  console.log(`Running a GraphQL server, listening on ${port}`);
}

function fail (err) {
  console.log(err);
  process.exit(1);
}
