'use strict';

const {
  createSchema,
  createQueryType,
  createQueryFields
} = require('./schema.js');

module.exports = {
  createClient: require('./client.js'),
  prepareSpaceGraph: require('./prepare-space-graph.js'),
  createSchema,
  createQueryType,
  createQueryFields,
  helpers: require('./helpers')
};
