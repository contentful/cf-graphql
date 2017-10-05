'use strict';
const createClient = require('./client.js');
const prepareSpaceGraph = require('./prepare-space-graph.js');
const helpers = require('./helpers');
const {
  createSchema,
  createQueryType,
  createQueryFields
} = require('./schema.js');

module.exports = function (opts) {
  this.opts = opts;
  return {
    createClient: () => createClient(opts),
    prepareSpaceGraph: (contentTypes) => prepareSpaceGraph(contentTypes, opts.basePageTypes, opts.allowMultipleContentTypeFieldsForBackref),
    createSchema: (spaceGraph, queryTypeName) => createSchema(spaceGraph, queryTypeName),
    createQueryType: () => createQueryType,
    createQueryFields: createQueryFields,
    helpers
  };
};
