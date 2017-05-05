'use strict';

const test = require('tape');

const helpers = require('../../src/helpers');

test('helpers: imports all functions successfully', function (t) {
  ['graphiql', 'expressGraphqlExtension'].forEach(m => {
    t.ok(typeof helpers[m], 'function');
  });

  t.end();
});
