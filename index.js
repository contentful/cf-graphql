'use strict';

const express = require('express');
const graphqlHTTP = require('express-graphql');

const app = express();

app.use(graphqlHTTP({
  schema: require('./schema.js'),
  graphiql: true
}));

app.listen(4000);
console.log('Listening on 4000');
