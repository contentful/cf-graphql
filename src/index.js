'use strict';
const createClient = require('./client.js');
const prepareSpaceGraph = require('./prepare-space-graph.js');
const helpers = require('./helpers');
const {
  createSchema,
  createQueryType,
  createQueryFields
} = require('./schema.js');

module.exports = class CfGraphql {
  constructor(opts) {
    this.opts = opts;
    this.createClient = () => createClient(opts);
    this.prepareSpaceGraph = (contentTypes) => prepareSpaceGraph(contentTypes, opts.basePageTypes, opts.allowMultipleContentTypeFieldsForBackref);
    this.createSchema = (spaceGraph, queryTypeName) => createSchema(spaceGraph, queryTypeName);
    this.createQueryType = () => createQueryType;
    this.createQueryFields = createQueryFields;
    this.helpers = helpers;
  }
};
