'use strict';

const test = require('tape');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const httpStub = {createContentfulClient: sinon.stub().resolves(this.get), get: sinon.stub().resolves({items: []})};
const createHttpClientStub = sinon.stub().returns(httpStub);
const createEntryLoaderStub = sinon.stub();

const createClient = proxyquire('../src/client.js', {
  './http-client.js': {
    'createContentfulClient': createHttpClientStub,
    'createRestClient': createHttpClientStub
  },
  './entry-loader.js': createEntryLoaderStub
});

const config = {
  spaceId: 'SPID',
  cdaToken: 'CDA-TOKEN',
  cmaToken: 'CMA-TOKEN'
};

const client = createClient(config);

test('client: with "locale" config option', function (t) {
  t.plan(2);
  createHttpClientStub.reset();
  createHttpClientStub.returns(httpStub);

  const c = createClient(Object.assign({locale: 'x'}, config));
  const defaultParams = n => createHttpClientStub.getCall(n).args[0].defaultParams;

  c.createEntryLoader();
  c.getContentTypes()
  .then(() => {
    t.deepEqual(defaultParams(0), {locale: 'x'});
    t.deepEqual(defaultParams(1), {});
  });
});

test('client: getting content types', function (t) {
  t.plan(3);
  httpStub.get.resolves({items: [1, {}, 3]});

  client.getContentTypes()
  .then(cts => {
    t.deepEqual(httpStub.get.firstCall.args, ['/content_types', {limit: 1000}]);
    t.deepEqual(cts, [1, {}, 3]);

    return Promise.all([
      Promise.resolve(createHttpClientStub.callCount),
      client.getContentTypes()
    ]);
  })
  .then(([count]) => t.equal(createHttpClientStub.callCount, count+1));
});

test('client: entry loader creation', function (t) {
  const entryLoader = {};
  createEntryLoaderStub.returns(entryLoader);

  t.equal(client.createEntryLoader(), entryLoader);
  t.deepEqual(createEntryLoaderStub.firstCall.args, [httpStub]);

  t.end();
});
