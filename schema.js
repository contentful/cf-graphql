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

const QueryType = new graphql.GraphQLObjectType({
  name: 'Query',
  fields: queryFields(require('./cts.json'))
});

const SysType = new GraphQLObjectType({
  name: 'Sys',
  fields: {
    id: {type: new GraphQLNonNull(GraphQLID)},
    createdAt: {type: new GraphQLNonNull(GraphQLString)},
    updatedAt: {type: new GraphQLNonNull(GraphQLString)}
  }
});

const LinkType = new GraphQLObjectType({
  name: 'Link',
  fields: {
    type: {type: new GraphQLNonNull(GraphQLString)},
    id: {type: new GraphQLNonNull(GraphQLID)}
  }
});

const TYPE_TO_FIELD = {
  String: produceSimpleFieldOf(GraphQLString),
  Int: produceSimpleFieldOf(graphql.GraphQLInt),
  Bool: produceSimpleFieldOf(graphql.GraphQLBoolean),
  Object: objectField,
  'Link<Entry>': refField,
  'Link<Asset>': refField,
  'Array<Symbol>': produceSimpleFieldOf(new GraphQLList(GraphQLString)),
  'Array<Link<Entry>>': arrayOfRefsField,
  'Array<Link<Asset>>': arrayOfRefsField
};

module.exports = new GraphQLSchema({query: QueryType});

function produceSimpleFieldOf (Type) {
  return field => ({
    type: maybeRequired(field, Type),
    resolve: entry => _get(entry, ['fields', field.id])
  });
}

function objectField (field) {
  return {
    type: maybeRequired(field, GraphQLString),
    resolve: entry => {
      const uniqueSomething = {};
      const value = _get(entry, ['fields', field.id], uniqueSomething);
      return value !== uniqueSomething ? JSON.stringify(value) : undefined;
    }
  };
}

function refField (field, ctIdToType) {
  const linkedCt = field.linkedCt;
  const Type = linkedCt ? ctIdToType[linkedCt] : LinkType;

  return {
    type: maybeRequired(field, Type),
    resolve: (entry, _, ctx) => {
      const link = _get(entry, ['fields', field.id]);
      if (link && linkedCt) {
        return ctx.entryLoader.get(link.sys.id, linkedCt);
      } else if (link) {
        return {type: link.sys.linkType, id: link.sys.id};
      }
    }
  };
}

function arrayOfRefsField (field, ctIdToType) {
  const linkedCt = field.linkedCt;
  const Type = new GraphQLList(linkedCt ? ctIdToType[linkedCt] : LinkType);

  return {
    type: maybeRequired(field, Type),
    resolve: (entry, _, ctx) => {
      const links = _get(entry, ['fields', field.id]);
      if (links && linkedCt) {
        return ctx.entryLoader.getMany(links.map(l => l.sys.id));
      } else if (links) {
        return links.map(l => ({type: l.sys.linkType, id: l.sys.id}));
      }
    }
  };
}

function maybeRequired (field, Type) {
  return field.required ? new GraphQLNonNull(Type) : Type;
}

function queryFields (cts) {
  const ctIdToType = {};

  return cts.reduce((acc, ct) => {
    const name = camelCase(ct.name);

    const Type = ctIdToType[ct.id] = new GraphQLObjectType({
      name: upperFirst(name),
      fields: () => {
        return ct.fields.reduce((acc, f) => {
          acc[f.id] = TYPE_TO_FIELD[f.type](f, ctIdToType);
          return acc;
        }, {sys: {type: new GraphQLNonNull(SysType)}});
      }
    });

    acc[name] = {
      type: Type,
      args: {
        id: {type: new GraphQLNonNull(GraphQLID)}
      },
      resolve: (_, args, ctx) => ctx.entryLoader.get(args.id, ct.id)
    };

    acc[pluralize(name)] = {
      type: new GraphQLList(Type),
      resolve: (_, args, ctx) => ctx.entryLoader.query(ct.id)
    };

    return acc;
  }, {});
}
