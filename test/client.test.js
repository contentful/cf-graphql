'use strict';

const test = require('tape');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const httpStub = {get: sinon.stub().resolves({items: []})};
const createHttpClientStub = sinon.stub().returns(httpStub);
const createEntryLoaderStub = sinon.stub();

const createClient = proxyquire('../src/client.js', {
  './http-client.js': createHttpClientStub,
  './entry-loader.js': createEntryLoaderStub
});

const config = {
  spaceId: 'SPID',
  cdaToken: 'CDA-TOKEN',
  cmaToken: 'CMA-TOKEN'
};

const client = createClient(config);

test('client: config options', function (t) {
  t.plan(6);

  const p1 = client.getContentTypes();
  client.createEntryLoader();

  const alt = {secure: false, domain: 'altdomain.com'};
  const c2 = createClient(Object.assign({}, config, alt));
  const p2 = c2.getContentTypes();
  c2.createEntryLoader();

  const preview = {preview: true, cpaToken: 'CPA-TOKEN'};
  const c3 = createClient(Object.assign({}, config, preview));
  const p3 = c3.getContentTypes();
  c3.createEntryLoader();

  const assertCall = (i, base, token) => {
    t.deepEqual(createHttpClientStub.getCall(i).args, [{
      base,
      headers: {Authorization: `Bearer ${token}-TOKEN`},
      defaultParams: {}
    }]);
  };

  Promise.all([p1, p2, p3]).then(() => {
    assertCall(0, 'https://api.contentful.com/spaces/SPID', 'CMA');
    assertCall(1, 'https://cdn.contentful.com/spaces/SPID', 'CDA');
    assertCall(2, 'http://api.altdomain.com/spaces/SPID', 'CMA');
    assertCall(3, 'http://cdn.altdomain.com/spaces/SPID', 'CDA');
    assertCall(4, 'https://api.contentful.com/spaces/SPID', 'CMA');
    assertCall(5, 'https://preview.contentful.com/spaces/SPID', 'CPA');
  });
});

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
