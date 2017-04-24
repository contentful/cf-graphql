'use strict';

const test = require('tape');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const stubs = {
  fetch: sinon.stub()
};

const createClient = proxyquire('../src/client.js', {
  'node-fetch': stubs.fetch
});

const client = createClient({spaceId: 'sid', cdaToken: 'token'});

const withReset = fn => t => {
  stubs.fetch.reset();
  fn(t);
};

test('client: getting content types', withReset(function (t) {
  t.plan(3);

  stubs.fetch.resolves({
    status: 200,
    json: () => ({items: [1, {}, 3]})
  });

  client.getContentTypes()
  .then(items => {
    t.deepEqual(items, [1, {}, 3]);
    t.equal(stubs.fetch.callCount, 1);
    t.deepEqual(stubs.fetch.firstCall.args, [
      'https://cdn.contentful.com/spaces/sid/content_types?limit=1000',
      {headers: {Authorization: 'Bearer token'}}
    ]);
  });
}));

test('client: non 2xx response codes', withReset(function (t) {
  t.plan(2);

  stubs.fetch.resolves({status: 199});

  client.getContentTypes()
  .catch(err => {
    t.equal(stubs.fetch.callCount, 1);
    t.deepEqual(err, {response: {status: 199}});
  });
}));
