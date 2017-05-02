'use strict';

const test = require('tape');

const index = require('../index.js');

test('index: all functions successfully imported', function (t) {
  ['createClient', 'prepareSpaceGraph', 'createSchema', 'createUI'].forEach(m => {
    t.equal(typeof index[m], 'function');
  });

  t.end();
});
