'use strict';

const graphql = require('graphql');
const _get = require('lodash.get');

module.exports = createBackrefsType;

function createBackrefsType (ct, ctIdToType) {
  return new graphql.GraphQLObjectType({
    name: `${ct.names.backrefsType}`,
    fields: ct.backrefs.reduce((acc, br) => {
      const Type = ctIdToType[br.ctId];
      if (Type) {
        acc[br.backrefFieldName] = createBackrefFieldConfig(br, Type);
      }
      return acc;
    }, {})
  });
}

function createBackrefFieldConfig (br, Type) {
  return {
    type: new graphql.GraphQLList(Type),
    resolve: (entryId, _, ctx) => {
      return ctx.entryLoader.query(br.ctId)
      .then(entries => filterEntries(entries, br.fieldId, entryId));
    }
  };
}

function filterEntries (entries, refFieldId, entryId) {
  return entries.filter(entry => {
    const refField = _get(entry, ['fields', refFieldId]);

    if (Array.isArray(refField)) {
      return !!refField.find(l => _get(l, ['sys', 'id']) === entryId);
    } else if (typeof refField === 'object') {
      return _get(refField, ['sys', 'id']) === entryId;
    } else {
      return false;
    }
  });
}
