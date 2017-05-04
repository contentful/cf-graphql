'use strict';

const test = require('tape');

const getResponse = require('../../src/helpers/graphiql.js');

test('ui: headers and status', function (t) {
  const {statusCode, headers} = getResponse();
  t.equal(statusCode, 200);
  t.deepEqual(headers, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  t.end();
});

test('ui: body', function (t) {
  const endpoints = [
    'http://localhost/graphql-endpoint',
    'https://remote.com/graphql',
    '/test'
  ];

  endpoints.forEach(url => {
    const {body} = getResponse({url});
    t.ok(body.includes(url));
  });

  ['test', 'demo'].forEach(title => {
    const {body} = getResponse({title});
    t.ok(body.includes(`<title>${title}</title>`));
  });

  t.end();
});

test('ui: default options', function (t) {
  const {body} = getResponse();
  t.ok(body.includes('/graphql'));
  t.ok(body.includes('<title>GraphiQL</title>'));
  t.end();
});
