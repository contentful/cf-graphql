'use strict';

const _get = require('lodash.get');

const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLString
} = require('graphql');

const { EntrySysType, EntryType, IDType, WebPageType } = require('./base-types.js');
const typeFieldConfigMap = require('./field-config.js');
const createBackrefsType = require('./backref-types.js');

module.exports = {
  createSchema,
  createQueryType,
  createQueryFields
};

function createSchema(spaceGraph, queryTypeName, basePageTypes) {
  return new GraphQLSchema({
    query: createQueryType(spaceGraph, queryTypeName, basePageTypes)
  });
}

function createQueryType(spaceGraph, name = 'Query', basePageTypes) {
  return new GraphQLObjectType({
    name,
    fields: createQueryFields(spaceGraph, basePageTypes)
  });
}

function createQueryFields(spaceGraph, basePageTypes = []) {
  const ctIdToType = {};

  let queryFields = spaceGraph.reduce((acc, ct) => {
    const defaultFieldsThunk = () => {
      const fields = { sys: { type: EntrySysType } };
      const BackrefsType = createBackrefsType(ct, ctIdToType);
      if (BackrefsType) {
        fields._backrefs = { type: BackrefsType, resolve: e => e.sys.id };
      }
      return fields;
    };

    const fieldsThunk = () => ct.fields.reduce((acc, f) => {
      acc[f.id] = typeFieldConfigMap[f.type](f, ctIdToType);
      return acc;
    }, defaultFieldsThunk());

    const interfaces = basePageTypes.includes(ct.id) ? [EntryType, WebPageType] : [EntryType]
    const Type = ctIdToType[ct.id] = new GraphQLObjectType({
      name: ct.names.type,
      interfaces: interfaces,
      fields: fieldsThunk,
      isTypeOf: entry => {
        const ctId = _get(entry, ['sys', 'contentType', 'sys', 'id']);
        return ctId === ct.id;
      }
    });

    acc[ct.names.field] = {
      type: Type,
      args: { id: { type: IDType } },
      resolve: (_, args, ctx) => {
        return ctx.entryLoader.get(args.id, ct.id);
      }
    };

    acc[ct.names.collectionField] = {
      type: new GraphQLList(Type),
      args: { q: { type: GraphQLString } },
      resolve: (_, args, ctx) => ctx.entryLoader.query(ct.id, args.q)
    };

    return acc;
  }, {});

  queryFields['basePage'].type.isTypeOf = entry => {
    const ctId = _get(entry, ['sys', 'contentType', 'sys', 'id']);
    return basePageTypes.includes(ctId);
  };

  queryFields['basePage'].resolve = (_, args, ctx) => {
    return ctx.entryLoader.queryBasePages().then(entries => entries.find(entry => _get(entry, ['sys', 'id']) === args.id));
  };

  return queryFields;
}
