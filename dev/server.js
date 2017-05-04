'use strict';

// Dev server that uses the local module:
const cfGraphql = require('..');

const express = require('express');
const graphqlHTTP = require('express-graphql');

// Shouldn't be versioned, can contain a CMA token
const config = require('./config.json');

const client = cfGraphql.createClient(config);

client.getContentTypes()
.then(cfGraphql.prepareSpaceGraph)
.then(spaceGraph => {
  const names = spaceGraph.map(ct => ct.names.type).join(', ');
  console.log(`Contentful content types prepared: ${names}`);
  return spaceGraph;
})
.then(cfGraphql.createSchema)
.then(schema => startServer(client, schema))
.catch(err => {
  console.log(err);
  process.exit(1);
});

function startServer (client, schema) {
  const app = express();
  const port = config.port || 4000;
  const {headers, statusCode, body} = cfGraphql.createUI();

  app.get('/', (_, res) => res.set(headers).status(statusCode).end(body));

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
