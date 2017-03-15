'use strict';

const fs = require('fs');
const path = require('path');
const _get = require('lodash.get');
const upperFirst = require('lodash.upperfirst');
const camelCase = require('lodash.camelcase');
const pluralize = require('pluralize');

const ENTITY_TYPES = [
  'Entry',
  'Asset'
];

const SHORTCUT_FIELD_TYPE_MAPPING = {
  Entry: 'Link<Entry>',
  Asset: 'Link<Asset>',
  Symbols: 'Array<Symbol>',
  Entries: 'Array<Link<Entry>>',
  Assets: 'Array<Link<Asset>>'
};

const SIMPLE_FIELD_TYPE_MAPPING = {
  Symbol: 'String',
  Text: 'String',
  Number: 'Int',
  Date: 'String',
  Boolean: 'Bool',
  Location: 'Object',
  Object: 'Object'
};

require('./client.js').getContentTypes().then(cts => {
  cts = cleanCts(cts);
  cts = addBackrefs(cts);

  fs.writeFile(
    path.resolve(__dirname, '..', 'cts.json'),
    JSON.stringify(cts, null, 2)
  );

  console.log('Saved', cts.map(ct => ct.names.type).join(', '));
}, err => {
  console.log(err);
  process.exit(1);
});

function cleanCts (cts) {
  return cts.map(ct => {
    const fieldName = camelCase(ct.name);
    const typeName = upperFirst(fieldName);

    return {
      id: ct.sys.id,
      names: {
        field: fieldName,
        collectionField: pluralize(fieldName),
        type: typeName,
        backrefsType: `${typeName}Backrefs`
      },
      fields: ct.fields.reduce((acc, f) => {
        return f.omitted ? acc : acc.concat([field(f)]);
      }, [])
    };
  });
}

function field (f) {
  if (f.id === 'sys') {
    throw new Error('Fields named "sys" are unsupported');
  }

  return {
    id: f.id,
    required: f.required,
    type: type(f),
    linkedCt: linkedCt(f)
  };
}

function type (f) {
  if (f.type === 'Array') {
    if (f.items.type === 'Symbol') {
      return 'Array<Symbol>';
    } else if (f.items.type === 'Link' && isEntityType(f.items.linkType)) {
      return `Array<Link<${f.items.linkType}>>`;
    } else {
      throw new Error('Invalid field of a type "Array"');
    }
  }

  if (f.type === 'Link') {
    if (isEntityType(f.linkType)) {
      return `Link<${f.linkType}>`;
    } else {
      throw new Error('Invalid field of a type "Link"');
    }
  }

  const mapped = SHORTCUT_FIELD_TYPE_MAPPING[f.type] || SIMPLE_FIELD_TYPE_MAPPING[f.type];
  if (mapped) {
    return mapped;
  } else {
    throw new Error(`Unknown field type: "${f.type}"`);
  }
}

function isEntityType (x) {
  return ENTITY_TYPES.indexOf(x) > -1;
}

function linkedCt (f) {
  const prop = 'linkContentType';
  const vs = _get(f, ['validations'], _get(f, ['items', 'validations'], []));
  const v = vs.find(v => Array.isArray(v[prop]) && v[prop].length === 1);
  const linkedCt = v && v[prop][0];

  if (linkedCt) {
    return linkedCt;
  }
}

function addBackrefs (cts) {
  const byId = cts.reduce((acc, ct) => {
    acc[ct.id] = ct;
    return acc;
  }, {});

  cts.forEach(ct => ct.fields.forEach(field => {
    if (field.linkedCt) {
      const linked = byId[field.linkedCt];
      linked.backrefs = linked.backrefs || [];
      linked.backrefs.push({
        ctId: ct.id,
        fieldId: field.id,
        backrefFieldName: ct.names.collectionField + '__via__' + field.id
      });
    }
  }));

  return cts;
}
