'use strict';

const graphql = require('graphql');
const _get = require('lodash.get');
const upperFirst = require('lodash.upperfirst');
const camelCase = require('lodash.camelcase');
const pluralize = require('pluralize');

const GraphQLSchema = graphql.GraphQLSchema;
const GraphQLNonNull = graphql.GraphQLNonNull;
const GraphQLObjectType = graphql.GraphQLObjectType;
const GraphQLList = graphql.GraphQLList;
const GraphQLID = graphql.GraphQLID;
const GraphQLString = graphql.GraphQLString;

const UNIQUE_NOTHING = {};

const IDType = new GraphQLNonNull(GraphQLID);
const NonNullStringType = new GraphQLNonNull(GraphQLString);

const QueryType = new graphql.GraphQLObjectType({
  name: 'Query',
  fields: queryFields(require('./cts.json'))
});

const SysType = new GraphQLNonNull(new GraphQLObjectType({
  name: 'Sys',
  fields: {
    id: {type: IDType},
    createdAt: {type: NonNullStringType},
    updatedAt: {type: NonNullStringType}
  }
}));

const LinkType = new GraphQLObjectType({
  name: 'Link',
  fields: {
    type: {type: NonNullStringType},
    id: {type: IDType}
  }
});

const AssetType = new GraphQLObjectType({
  name: 'Asset',
  fields: {
    sys: {type: SysType},
    title: {type: IDType},
    description: {type: GraphQLString},
    url: {type: GraphQLString}
  }
});

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

module.exports = new GraphQLSchema({query: QueryType});

function createCfFieldConfig (Type, field, resolveFn) {
  return {
    type: field.required ? new GraphQLNonNull(Type) : Type,
    resolve: (entity, _, ctx) => {
      const fieldValue = _get(entity, ['fields', field.id], UNIQUE_NOTHING);
      if (resolveFn) {
        return resolveFn(fieldValue, ctx);
      } else if (fieldValue !== UNIQUE_NOTHING) {
        return fieldValue;
      }
    }
  };
}

function createCfObjectFieldConfig (field) {
  return createCfFieldConfig(GraphQLString, field, value => {
    if (value !== UNIQUE_NOTHING) {
      return JSON.stringify(value);
    }
  });
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
  const Type = linkedCt ? ctIdToType[linkedCt] : LinkType;

  return createCfFieldConfig(Type, field, (link, ctx) => {
    if (link && linkedCt) {
      return ctx.entryLoader.get(link.sys.id, linkedCt);
    } else if (link) {
      return {type: link.sys.linkType, id: link.sys.id};
    }
  });
}

function createCfEntryArrayFieldConfig (field, ctIdToType) {
  const linkedCt = field.linkedCt;
  const Type = new GraphQLList(linkedCt ? ctIdToType[linkedCt] : LinkType);

  return createCfFieldConfig(Type, field, (links, ctx) => {
    if (links && linkedCt) {
      return ctx.entryLoader.getMany(links.map(l => l.sys.id));
    } else if (links) {
      return links.map(l => ({type: l.sys.linkType, id: l.sys.id}));
    }
  });
}

function queryFields (cts) {
  const ctIdToType = {};

  return cts.reduce((acc, ct) => {
    const name = camelCase(ct.name);

    const Type = ctIdToType[ct.id] = new GraphQLObjectType({
      name: upperFirst(name),
      fields: () => {
        return ct.fields.reduce((acc, f) => {
          acc[f.id] = CF_TYPE_TO_FIELD_CONFIG[f.type](f, ctIdToType);
          return acc;
        }, {sys: {type: SysType}});
      }
    });

    acc[name] = {
      type: Type,
      args: {id: {type: IDType}},
      resolve: (_, args, ctx) => ctx.entryLoader.get(args.id, ct.id)
    };

    acc[pluralize(name)] = {
      type: new GraphQLList(Type),
      resolve: (_, args, ctx) => ctx.entryLoader.query(ct.id)
    };

    return acc;
  }, {});
}
