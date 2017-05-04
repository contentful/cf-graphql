'use strict';

const _get = require('lodash.get');

const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLString
} = require('graphql');

const {EntrySysType, EntryType, IDType} = require('./base-types.js');
const typeFieldConfigMap = require('./field-config.js');
const createBackrefsType = require('./backref-types.js');

module.exports = createSchema;

function createSchema (spaceGraph) {
  const QueryType = new GraphQLObjectType({
    name: 'Query',
    fields: queryFields(spaceGraph)
  });

  return new GraphQLSchema({query: QueryType});
}

function queryFields (spaceGraph) {
  const ctIdToType = {};

  return spaceGraph.reduce((acc, ct) => {
    const defaultFieldsThunk = () => {
      const fields = {sys: {type: EntrySysType}};
      const BackrefsType = createBackrefsType(ct, ctIdToType);
      if (BackrefsType) {
        fields._backrefs = {type: BackrefsType, resolve: e => e.sys.id};
      }
      return fields;
    };

    const fieldsThunk = () => ct.fields.reduce((acc, f) => {
      acc[f.id] = typeFieldConfigMap[f.type](f, ctIdToType);
      return acc;
    }, defaultFieldsThunk());

    const Type = ctIdToType[ct.id] = new GraphQLObjectType({
      name: ct.names.type,
      interfaces: [EntryType],
      fields: fieldsThunk,
      isTypeOf: entry => {
        const ctId = _get(entry, ['sys', 'contentType', 'sys', 'id']);
        return ctId === ct.id;
      }
    });

    acc[ct.names.field] = {
      type: Type,
      args: {id: {type: IDType}},
      resolve: (_, args, ctx) => ctx.entryLoader.get(args.id, ct.id)
    };

    acc[ct.names.collectionField] = {
      type: new GraphQLList(Type),
      args: {q: {type: GraphQLString}},
      resolve: (_, args, ctx) => ctx.entryLoader.query(ct.id, args.q)
    };

    return acc;
  }, {});
}
