'use strict';

const test = require('tape');

const index = require('..');

test('index: all methods/wrappers successfully imported', function (t) {
  const methods = [
    'createClient',
    'prepareSpaceGraph',
    'createSchema',
    'createQueryType',
    'createQueryFields'
  ];

  const wrappers = ['helpers'];

  methods.forEach(m => t.equal(typeof index[m], 'function'));
  wrappers.forEach(w => t.equal(typeof index[w], 'object'));

  t.equal(
    Object.keys(index).length,
    methods.length + wrappers.length
  );

  t.equal(index.helpers, require('../src/helpers'));

  t.end();
});
