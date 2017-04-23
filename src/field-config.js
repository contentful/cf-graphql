'use strict';

const _get = require('lodash.get');

const {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList
} = require('graphql');

const {AssetType, EntryType} = require('./base-types.js');

const NOTHING = {};

// TODO: handle "Location" and "Date(time)"
module.exports = {
  String: field => createFieldConfig(GraphQLString, field),
  Int: field => createFieldConfig(GraphQLInt, field),
  Float: field => createFieldConfig(GraphQLFloat, field),
  Bool: field => createFieldConfig(GraphQLBoolean, field),
  Object: createObjectFieldConfig,
  'Array<String>': createArrayOfStringsFieldConfig,
  'Link<Asset>': createAssetFieldConfig,
  'Array<Link<Asset>>': createArrayOfAssetsFieldConfig,
  'Link<Entry>': createEntryFieldConfig,
  'Array<Link<Entry>>': createArrayOfEntriesFieldConfig
};

function createFieldConfig (Type, field, resolveFn) {
  return {
    type: Type,
    resolve: (entity, _, ctx) => {
      const fieldValue = _get(entity, ['fields', field.id], NOTHING);
      if (fieldValue !== NOTHING) {
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
      return links.map(link => getAsset(link, ctx)).filter(is('object'));
    }
  });
}

function getAsset (link, ctx) {
  return ctx.entryLoader.getIncludedAsset(getLinkedId(link));
}

function createEntryFieldConfig (field, ctIdToType) {
  return createFieldConfig(typeFor(field, ctIdToType), field, (link, ctx) => {
    return ctx.entryLoader.get(getLinkedId(link), field.linkedCt);
  });
}

function createArrayOfEntriesFieldConfig (field, ctIdToType) {
  const Type = new GraphQLList(typeFor(field, ctIdToType));

  return createFieldConfig(Type, field, (links, ctx) => {
    if (Array.isArray(links)) {
      const ids = links.map(getLinkedId).filter(is('string'));
      return ctx.entryLoader.getMany(ids).then(coll => coll.filter(is('object')));
    }
  });
}

function getLinkedId (link) {
  return _get(link, ['sys', 'id']);
}

function typeFor ({linkedCt}, ctIdToType = {}) {
  if (linkedCt) {
    return ctIdToType[linkedCt] || EntryType;
  } else {
    return EntryType;
  }
}

function is (type) {
  return entity => typeof entity === type;
}
