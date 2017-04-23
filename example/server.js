'use strict';

// defaults, can be overridden with env variables
const PORT = 4000;
const SPACE_ID = 'f9gzm4p998uo';
const CDA_TOKEN = '7563852245db5888c3c7e13afb90686b8b921ef3271d9e8cf28f468e5d122889';

const express = require('express');
const graphqlHTTP = require('express-graphql');

// requiring a local module; outside of this repo require "cf-graphql"
const cfGraphql = require('..');
const createUI = require('./graphiql.js');

const port = process.env.PORT || PORT;
const spaceId = process.env.SPACE_ID  || SPACE_ID;
const cdaToken = process.env.CDA_TOKEN || CDA_TOKEN;

const client = cfGraphql.createClient({spaceId, cdaToken});

console.log(`Preparing a schema for a Contentful space: ${spaceId}`);

client.getContentTypes()
.then(cfGraphql.prepareCts)
.then(spaceContentTypes => {
  const names = spaceContentTypes.map(ct => ct.names.type).join(', ');
  console.log(`Contentful content types prepared: ${names}`);
  return spaceContentTypes;
})
.then(cfGraphql.createSchema)
.then(startServer)
.catch(fail);

function startServer (schema) {
  const app = express();
  const ui = createUI(`http://localhost:${port}/graphql`);

  app.get('/', (_, res) => res.set(ui.headers).status(ui.statusCode).end(ui.body));

  app.use('/graphql', graphqlHTTP(() => {
    const start = Date.now();
    const entryLoader = client.createEntryLoader();

    return {
      context: {entryLoader},
      schema,
      graphiql: false,
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
