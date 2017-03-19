'use strict';

const _get = require('lodash.get');
const graphql = require('graphql');
const baseTypes = require('./base-types.js');

const GraphQLString = graphql.GraphQLString;
const GraphQLList = graphql.GraphQLList;

const AssetType = baseTypes.AssetType;
const EntryType = baseTypes.EntryType;

module.exports = {
  String: field => createFieldConfig(GraphQLString, field),
  Int: field => createFieldConfig(graphql.GraphQLInt, field),
  Bool: field => createFieldConfig(graphql.GraphQLBoolean, field),
  Object: createObjectFieldConfig,
  'Array<String>': createArrayOfStringsFieldConfig,
  'Link<Asset>': createAssetFieldConfig,
  'Array<Link<Asset>>': createArrayOfAssetsFieldConfig,
  'Link<Entry>': createEntryFieldConfig,
  'Array<Link<Entry>>': createArrayOfEntriesFieldConfig
};

function createFieldConfig (Type, field, resolveFn) {
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

function createObjectFieldConfig (field) {
  return createFieldConfig(GraphQLString, field, val => JSON.stringify(val));
}

function createArrayOfStringsFieldConfig (field) {
  return createFieldConfig(new GraphQLList(GraphQLString), field);
}

function createAssetFieldConfig (field) {
  return createFieldConfig(AssetType, field, getAsset);
}

function createArrayOfAssetsFieldConfig (field) {
  return createFieldConfig(new GraphQLList(AssetType), field, (links, ctx) => {
    if (Array.isArray(links)) {
      return links
      .map(link => getAsset(link, ctx))
      .filter(asset => typeof asset === 'object');
    }
  });
}

function getAsset (link, ctx) {
  return ctx.entryLoader.getIncludedAsset(getLinkedId(link));
}

function createEntryFieldConfig (field, ctIdToType) {
  const linkedCt = field.linkedCt;
  const Type = linkedCt ? ctIdToType[linkedCt] : EntryType;

  return createFieldConfig(Type, field, (link, ctx) => {
    return ctx.entryLoader.get(getLinkedId(link), linkedCt);
  });
}

function createArrayOfEntriesFieldConfig (field, ctIdToType) {
  const linkedCt = field.linkedCt;
  const Type = new GraphQLList(linkedCt ? ctIdToType[linkedCt] : EntryType);

  return createFieldConfig(Type, field, (links, ctx) => {
    if (Array.isArray(links)) {
      const ids = links
      .map(getLinkedId)
      .filter(id => typeof id === 'string');
      return ctx.entryLoader.getMany(ids);
    }
  });
}

function getLinkedId (link) {
  return _get(link, ['sys', 'id']);
}
