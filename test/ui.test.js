'use strict';

const test = require('tape');

const createUI = require('../src/ui.js');

const endpoints = [
  'http://localhost/graphql-endpoint',
  'https://remote.com/graphql'
];

test('ui: headers and status', function (t) {
  const {statusCode, headers} = createUI(endpoints[0]);
  t.equal(statusCode, 200);
  t.deepEqual(headers, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  t.end();
});

test('ui: body', function (t) {
  endpoints.forEach(endpoint => {
    const {body} = createUI(endpoint);
    t.ok(body.includes(endpoint));
  });

  t.end();
});

test('ui: default endpoint', function (t) {
  const {body} = createUI();
  t.ok(body.includes('/graphql'));
  t.end();
});
