'use strict';

const test = require('tape');

const index = require('..');

test('index: all functions successfully imported', function (t) {
  ['createClient', 'prepareSpaceGraph', 'createSchema'].forEach(m => {
    t.equal(typeof index[m], 'function');
  });

  t.equal(typeof index.helpers, 'object');

  t.end();
});
