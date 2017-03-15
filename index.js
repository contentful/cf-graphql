'use strict';

const express = require('express');
const graphqlHTTP = require('express-graphql');
const client = require('./src/client.js');

const schema = require('./src/schema.js');

const app = express();

let queryCount = 0;
const createLogger = () => {
  queryCount += 1;
  const prefix = `[Query ${queryCount}]`;
  const logs = [];

  return {
    log: function () {
      const args = Array.prototype.slice.call(arguments);
      if (args.length > 0) {
        logs.push(args.length === 1 ? args[0] : args);
        console.log.apply(console, [prefix].concat(args));
      }
    },
    getLogs: () => logs
  };
};

app.get('/', (req, res) => {
  res.redirect('/ui');
});

app.get('/ui', (req, res) => {
  const ui = require('./src/graphiql.js');
  res.set(ui.headers).status(ui.statusCode).send(ui.body);
});

app.use('/graphql', graphqlHTTP(() => {
  const start = Date.now();
  const logger = createLogger();
  const entryLoader = client.createEntryLoader(logger.log);

  logger.log('arrived');

  return {
    context: {entryLoader},
    schema,
    graphiql: false,
    extensions: () => ({time: Date.now()-start, logs: logger.getLogs()}),
    formatError: error => ({
      message: error.message,
      locations: error.locations,
      stack: error.stack
    })
  };
}));

app.listen(4000);
console.log('Listening on 4000');
