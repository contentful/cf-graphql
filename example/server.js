'use strict';

const express = require('express');
const graphqlHTTP = require('express-graphql');

const cfGraphql = require('..');
const client = cfGraphql.createClient(require('./resources/config.json'));
const schema = cfGraphql.createSchema(require('./resources/cts.json'));
const createUI = require('./graphiql.js');

const PORT = 4000;

const app = express();

app.get('/', (req, res) => {
  const ui = createUI(`http://localhost:${PORT}/graphql`);
  res.set(ui.headers).status(ui.statusCode).end(ui.body);
});

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

app.listen(PORT);
console.log(`Listening on ${PORT}`);
