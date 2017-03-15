'use strict';

const _get = require('lodash.get');

const graphql = require('graphql');
const GraphQLObjectType = graphql.GraphQLObjectType;
const GraphQLList = graphql.GraphQLList;
const GraphQLString = graphql.GraphQLString;

const baseTypes = require('./base-types.js');
const EntrySysType = baseTypes.EntrySysType;
const AssetType = baseTypes.AssetType;
const EntryType = baseTypes.EntryType;
const createBackrefsType = require('./backref-types.js');

const CF_TYPE_TO_FIELD_CONFIG = {
  String: field => createCfFieldConfig(GraphQLString, field),
  Int: field => createCfFieldConfig(graphql.GraphQLInt, field),
  Bool: field => createCfFieldConfig(graphql.GraphQLBoolean, field),
  Object: createCfObjectFieldConfig,
  'Link<Asset>': createCfAssetFieldConfig,
  'Link<Entry>': createCfEntryFieldConfig,
  'Array<Symbol>': field => createCfFieldConfig(new GraphQLList(GraphQLString), field),
  'Array<Link<Asset>>': createCfAssetArrayFieldConfig,
  'Array<Link<Entry>>': createCfEntryArrayFieldConfig
};

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: queryFields(require('../cts.json'))
});

module.exports = new graphql.GraphQLSchema({query: QueryType});

function createCfFieldConfig (Type, field, resolveFn) {
  return {
    type: field.required ? new graphql.GraphQLNonNull(Type) : Type,
    resolve: (entity, _, ctx) => {
      const uniqueNothing = {};
      const fieldValue = _get(entity, ['fields', field.id], uniqueNothing);
      if (fieldValue !== uniqueNothing) {
        return resolveFn ? resolveFn(fieldValue, ctx) : fieldValue;
      }
    }
  };
}

function createCfObjectFieldConfig (field) {
  return createCfFieldConfig(GraphQLString, field, val => JSON.stringify(val));
}

function createCfAssetFieldConfig (field) {
  return createCfFieldConfig(AssetType, field, (link, ctx) => {
    return prepareAsset(getAsset(ctx, link));
  });
}

function createCfAssetArrayFieldConfig (field) {
  return createCfFieldConfig(new GraphQLList(AssetType), field, (links, ctx) => {
    if (links) {
      return links
      .map(link => prepareAsset(getAsset(ctx, link)))
      .filter(asset => typeof asset === 'object');
    }
  });
}

function getAsset (ctx, link) {
  return ctx.entryLoader.getIncludedAsset(_get(link, ['sys', 'id']));
}

function prepareAsset (entity) {
  if (entity) {
    return {
      sys: entity.sys,
      title: _get(entity, ['fields', 'title']),
      description: _get(entity, ['fields', 'description']),
      url: _get(entity, ['fields', 'file', 'url'])
    };
  }
}

function createCfEntryFieldConfig (field, ctIdToType) {
  const linkedCt = field.linkedCt;
  const Type = linkedCt ? ctIdToType[linkedCt] : EntryType;

  return createCfFieldConfig(Type, field, (link, ctx) => {
    return ctx.entryLoader.get(_get(link, ['sys', 'id']), linkedCt);
  });
}

function createCfEntryArrayFieldConfig (field, ctIdToType) {
  const linkedCt = field.linkedCt;
  const Type = new GraphQLList(linkedCt ? ctIdToType[linkedCt] : EntryType);

  return createCfFieldConfig(Type, field, (links, ctx) => {
    const ids = links
    .map(l => _get(l, ['sys', 'id']))
    .filter(l => typeof l === 'string');
    return ctx.entryLoader.getMany(ids);
  });
}

function queryFields (cts) {
  const ctIdToType = {};

  return cts.reduce((acc, ct) => {
    const defaultFieldsThunk = () => {
      const fields = {sys: {type: EntrySysType}};
      if (ct.backrefs) {
        const Type = createBackrefsType(ct, ctIdToType);
        fields._backrefs = {type: Type, resolve: entry => entry.sys.id};
      }
      return fields;
    };

    const fieldsThunk = () => ct.fields.reduce((acc, f) => {
      acc[f.id] = CF_TYPE_TO_FIELD_CONFIG[f.type](f, ctIdToType);
      return acc;
    }, defaultFieldsThunk());

    const Type = ctIdToType[ct.id] = new GraphQLObjectType({
      name: ct.names.type,
      interfaces: [EntryType],
      fields: fieldsThunk,
      isTypeOf: entry => _get(entry, ['sys', 'contentType', 'sys', 'id']) === ct.id
    });

    acc[ct.names.field] = {
      type: Type,
      args: {id: {type: baseTypes.IDType}},
      resolve: (_, args, ctx) => ctx.entryLoader.get(args.id, ct.id)
    };

    acc[ct.names.collectionField] = {
      type: new GraphQLList(Type),
      resolve: (_, args, ctx) => ctx.entryLoader.query(ct.id)
    };

    return acc;
  }, {});
}
