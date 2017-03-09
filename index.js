'use strict';

const express = require('express');
const graphqlHTTP = require('express-graphql');

const app = express();

app.use(express.static('.'));
app.use('/graphql', graphqlHTTP({
  schema: require('./schema.js'),
  graphiql: false
}));

app.listen(4000);
console.log('Listening on 4000');
