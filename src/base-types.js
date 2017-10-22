'use strict';

const _get = require('lodash.get');

const {
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType,
  GraphQLID,
  GraphQLInterfaceType,
  GraphQLFloat,
  GraphQLInt
} = require('graphql');

const IDType = new GraphQLNonNull(GraphQLID);
const NonNullStringType = new GraphQLNonNull(GraphQLString);

const baseSysFields = {
  id: {type: IDType},
  createdAt: {type: NonNullStringType},
  updatedAt: {type: NonNullStringType}
};

const entrySysFields = {
  contentTypeId: {
    type: IDType,
    resolve: sys => _get(sys, ['contentType', 'sys', 'id'])
  }
};

const SysType = new GraphQLInterfaceType({
  name: 'Sys',
  fields: baseSysFields
});

const AssetSysType = createSysType('Asset');
const EntrySysType = createSysType('Entry', entrySysFields);

const AssetType = new GraphQLObjectType({
  name: 'Asset',
  fields: {
    sys: {type: AssetSysType},
    title: {
      type: GraphQLString,
      resolve: asset =>  _get(asset, ['fields', 'title'])
    },
    description: {
      type: GraphQLString,
      resolve: asset => _get(asset, ['fields', 'description'])
    },
    url: {
      type: GraphQLString,
      resolve: asset => _get(asset, ['fields', 'file', 'url'])
    }
  }
});

const EntryType = new GraphQLInterfaceType({
  name: 'Entry',
  fields: {sys: {type: EntrySysType}}
});

const LocationType = new GraphQLObjectType({
  name: 'Location',
  fields: {
    lon: {type: GraphQLFloat},
    lat: {type: GraphQLFloat}
  }
});

const CollectionMetaType = new GraphQLObjectType({
  name: 'CollectionMeta',
  fields: {count: {type: GraphQLInt}}
});

module.exports = {
  IDType,
  SysType,
  AssetSysType,
  EntrySysType,
  AssetType,
  EntryType,
  LocationType,
  CollectionMetaType
};

function createSysType (entityType, extraFields) {
  return new GraphQLNonNull(new GraphQLObjectType({
    name: `${entityType}Sys`,
    interfaces: [SysType],
    fields: Object.assign({}, baseSysFields, extraFields || {}),
    isTypeOf: sys => _get(sys, ['type']) === entityType
  }));
}
