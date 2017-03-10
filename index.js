'use strict';

const express = require('express');
const graphqlHTTP = require('express-graphql');
const client = require('./client.js');

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

app.use(express.static('.'));

app.use('/graphql', graphqlHTTP(() => {
  const log = createLogger();
  const entryLoader = client.createEntryLoader(log);

  log('arrived');

  return {
    context: {entryLoader},
    schema: require('./schema.js'),
    graphiql: false
  };
}));

app.listen(4000);
console.log('Listening on 4000');
