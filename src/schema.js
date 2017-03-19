'use strict';

const _get = require('lodash.get');
const graphql = require('graphql');
const baseTypes = require('./base-types.js');
const typeFieldConfigMap = require('./field-config.js');
const createBackrefsType = require('./backref-types.js');

module.exports = createSchema;

function createSchema (cts) {
  const QueryType = new graphql.GraphQLObjectType({
    name: 'Query',
    fields: queryFields(cts)
  });

  return new graphql.GraphQLSchema({query: QueryType});
}

function queryFields (cts) {
  const ctIdToType = {};

  return cts.reduce((acc, ct) => {
    const defaultFieldsThunk = () => {
      const fields = {sys: {type: baseTypes.EntrySysType}};
      if (ct.backrefs) {
        const BackrefsType = createBackrefsType(ct, ctIdToType);
        fields._backrefs = {
          type: BackrefsType,
          resolve: entry => entry.sys.id
        };
      }
      return fields;
    };

    const fieldsThunk = () => ct.fields.reduce((acc, f) => {
      acc[f.id] = typeFieldConfigMap[f.type](f, ctIdToType);
      return acc;
    }, defaultFieldsThunk());

    const Type = ctIdToType[ct.id] = new graphql.GraphQLObjectType({
      name: ct.names.type,
      interfaces: [baseTypes.EntryType],
      fields: fieldsThunk,
      isTypeOf: entry => {
        const ctId = _get(entry, ['sys', 'contentType', 'sys', 'id']);
        return ctId === ct.id;
      }
    });

    acc[ct.names.field] = {
      type: Type,
      args: {id: {type: baseTypes.IDType}},
      resolve: (_, args, ctx) => ctx.entryLoader.get(args.id, ct.id)
    };

    acc[ct.names.collectionField] = {
      type: new graphql.GraphQLList(Type),
      resolve: (_, args, ctx) => ctx.entryLoader.query(ct.id)
    };

    return acc;
  }, {});
}
