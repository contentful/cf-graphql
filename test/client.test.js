'use strict';

const test = require('tape');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const httpStub = {get: sinon.stub()};
const createHttpClientStub = sinon.stub().returns(httpStub);
const createEntryLoaderStub = sinon.stub();

const createClient = proxyquire('../src/client.js', {
  './http-client.js': createHttpClientStub,
  './entry-loader.js': createEntryLoaderStub
});

const client = createClient({spaceId: 'SPID', cdaToken: 'token'});

const expectedHttpClientConfig = {
  base: 'https://cdn.contentful.com/spaces/SPID',
  headers: {Authorization: 'Bearer token'}
};

test('client: getting content types', function (t) {
  t.plan(4);
  httpStub.get.resolves({items: [1, {}, 3]});

  const p = client.getContentTypes()
  .then(cts => {
    t.deepEqual(createHttpClientStub.firstCall.args, [expectedHttpClientConfig]);
    t.deepEqual(httpStub.get.firstCall.args, ['/content_types', {limit: 1000}]);
    t.deepEqual(cts, [1, {}, 3]);
  });

  Promise.all([p, client.getContentTypes()])
  .then(() => t.equal(createHttpClientStub.callCount, 2));
});

test('client: entry loader creation', function (t) {
  const entryLoader = {};
  createEntryLoaderStub.returns(entryLoader);

  t.equal(client.createEntryLoader(), entryLoader);
  t.deepEqual(createHttpClientStub.lastCall.args, [expectedHttpClientConfig]);
  t.deepEqual(createEntryLoaderStub.firstCall.args, [httpStub]);

  t.end();
});
