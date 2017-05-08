'use strict';

const test = require('tape');

const createExtension = require('../../src/helpers/express-graphql-extension.js');

const loader = {getTimeline: () => [{url: '/test', start: 10, duration: 20}]};
const client = {createEntryLoader: () => loader};
const schema = {};

test('express-graphql-extension: default options', function (t) {

  const extension = createExtension(client, schema);

  t.deepEqual(extension(), {
    context: {entryLoader: loader},
    schema,
    graphiql: false,
    extensions: undefined,
    formatError: undefined
  });

  t.end();
});

test('express-graphql-extension: cf-graphql version extension', function (t) {
  const extension = createExtension(client, schema, {version: true});
  const extensions = extension().extensions();

  t.deepEqual(extensions['cf-graphql'], {
    version: require('../../package.json').version
  });

  t.end();
});

test('express-graphql-extension: timeline extension', function (t) {
  const extension = createExtension(client, schema, {timeline: true});
  const extensions = extension().extensions();

  t.equal(typeof extensions.time, 'number');
  t.ok(extensions.time >= 0);

  t.ok(Array.isArray(extensions.timeline));
  t.equal(extensions.timeline.length, 1);

  const first = extensions.timeline[0];
  t.deepEqual(Object.keys(first).sort(), ['url', 'start', 'duration'].sort());
  t.ok(first.start <= 10);

  t.end();
});

test('express-graphql-extension: detailed errors', function (t) {
  const extension = createExtension(client, schema, {detailedErrors: true});
  const {formatError} = extension();

  t.equal(typeof formatError, 'function');

  const err = new Error('test');
  const stack = err.stack;
  err.locations = 'LOCS';
  err.path = 'PATH';

  t.deepEqual(formatError(err), {
    message: 'test',
    locations: 'LOCS',
    path: 'PATH',
    stack
  });

  t.end();
});
