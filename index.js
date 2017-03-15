'use strict';

const express = require('express');
const graphqlHTTP = require('express-graphql');
const client = require('./src/client.js');

const app = express();

let queryCount = 0;
const createLogger = () => {
  queryCount += 1;
  const prefix = `[Query ${queryCount}]`;
  return function () {
    const args = Array.prototype.slice.call(arguments);
    return console.log.apply(console, [prefix].concat(args));
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
  const log = createLogger();
  const entryLoader = client.createEntryLoader(log);

  log('arrived');

  return {
    context: {entryLoader},
    schema: require('./src/schema.js'),
    graphiql: false
  };
}));

app.listen(4000);
console.log('Listening on 4000');
