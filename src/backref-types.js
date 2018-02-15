'use strict';

const _get = require('lodash.get');
const {GraphQLString, GraphQLInt, GraphQLObjectType, GraphQLList} = require('graphql');

module.exports = createBackrefsType;

function createBackrefsType (ct, ctIdToType) {
  const fields = prepareBackrefsFields(ct, ctIdToType);
  if (Object.keys(fields).length > 0) {
    return new GraphQLObjectType({name: ct.names.backrefsType, fields});
  }
}

function prepareBackrefsFields (ct, ctIdToType) {
  return (ct.backrefs || []).reduce((acc, backref) => {
    const Type = ctIdToType[backref.ctId];
    if (Type) {
      acc[backref.backrefFieldName] = createBackrefFieldConfig(backref, Type);
    }
    return acc;
  }, {});
}

function createBackrefFieldConfig (backref, Type) {
  return {
    type: new GraphQLList(Type),
    args: {
      q: {type: GraphQLString},
      skip: {type: GraphQLInt},
      limit: {type: GraphQLInt},
    },
    resolve: (entryId, args, ctx) => {
      let q = `fields.${backref.fieldId}.sys.id[in]=${entryId}`;
      if (args.q) q = q + `&${args.q}`;

      return ctx.entryLoader.query(backref.ctId, {
        q,
        skip: args.skip,
        limit: args.limit,
      })
    }
  };
}

function filterEntries (entries, refFieldId, entryId) {
  return entries.filter(entry => {
    const refField = _get(entry, ['fields', refFieldId]);

    if (Array.isArray(refField)) {
      return !!refField.find(link => _get(link, ['sys', 'id']) === entryId);
    } else if (typeof refField === 'object') {
      return _get(refField, ['sys', 'id']) === entryId;
    } else {
      return false;
    }
  });
}
