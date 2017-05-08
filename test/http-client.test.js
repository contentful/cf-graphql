'use strict';

const test = require('tape');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const stubs = {
  'node-fetch': sinon.stub(),
  platform: sinon.stub().returns(null),
  release: sinon.stub().returns(null)
};

const createClient = proxyquire('../src/http-client.js', {
  'node-fetch': stubs['node-fetch'],
  os: {platform: stubs.platform, release: stubs.release}
});

const prepare = (val, defaultParams = {}) => {
  const fetch = stubs['node-fetch'];
  fetch.reset();
  fetch.resolves(val || {status: 200, json: () => true});

  return {
    fetch,
    http: createClient({
      base: 'http://test.com',
      headers: {'X-Test': 'yes'},
      defaultParams
    })
  };
};

const mockNodeVersion = ver => {
  const original = process.versions;
  Object.defineProperty(process, 'versions', {value: {node: ver}});
  return () => Object.defineProperty(process, 'versions', original);
};

test('http-client: using base and headers', function (t) {
  t.plan(4);
  const {fetch, http} = prepare();

  http.get('/endpoint')
  .then(res => {
    t.equal(res, true);
    t.equal(fetch.callCount, 1);
    t.equal(fetch.firstCall.args[0], 'http://test.com/endpoint');
    t.equal(fetch.firstCall.args[1].headers['X-Test'], 'yes');
  });
});

test('http-client: using default params option', function (t) {
  t.plan(3);
  const {fetch, http} = prepare(undefined, {locale: 'de-DE'});

  Promise.all([
    http.get('/x', {content_type: 'ctid'}),
    http.get('/y', {locale: 'x'})
  ])
  .then(() => {
    t.equal(fetch.callCount, 2);
    t.deepEqual(fetch.firstCall.args[0].split('?')[1], 'content_type=ctid&locale=de-DE');
    t.deepEqual(fetch.lastCall.args[0].split('?')[1], 'locale=x');
  });
});

test('http-client: defaults', function (t) {
  t.plan(1);
  const {fetch} = prepare();

  createClient()
  .get('http://some-api.com/endpoint')
  .then(() => t.equal(fetch.firstCall.args[0], 'http://some-api.com/endpoint'));
});

test('http-client: non 2xx response codes', function (t) {
  t.plan(3);
  const {fetch, http} = prepare({status: 199, statusText: 'BOOM!'});

  http.get('/err')
  .catch(err => {
    t.equal(fetch.callCount, 1);
    t.ok(err instanceof Error);
    t.deepEqual(err, {response: {status: 199, statusText: 'BOOM!'}});
  });
});

test('http-client: reuses already fired requests', function (t) {
  t.plan(2);
  const {fetch, http} = prepare();

  const p1 = http.get('/one');
  const p2 = http.get('/one');

  Promise.all([p1, http.get('/two'), p2])
  .then(() => {
    t.equal(p1, p2);
    t.equal(fetch.callCount, 2);
  });
});

test('http-client: sorts parameters', function (t) {
  t.plan(4);
  const {fetch, http} = prepare();

  const p1 = http.get('/one', {z: 123, a: 456});
  const p2 = http.get('/one', {a: 456, z: 123});

  Promise.all([p1, http.get('/two', {omega: true, alfa: false}), p2])
  .then(() => {
    t.equal(p1, p2);
    t.equal(fetch.callCount, 2);
    t.equal(fetch.firstCall.args[0], 'http://test.com/one?a=456&z=123');
    t.equal(fetch.secondCall.args[0], 'http://test.com/two?alfa=false&omega=true');
  });
});

test('http-client: timeline', function (t) {
  t.plan(5);
  const {http} = prepare();

  Promise.all([http.get('/one'), http.get('/two')])
  .then(() => {
    t.equal(http.timeline.length, 2);
    const [t1, t2] = http.timeline;
    t.equal(t1.url, '/one');
    t.equal(t2.url, '/two');
    t.ok(t1.start <= t2.start);
    t.ok(typeof t1.duration === 'number');
  });
});

test('http-client: minimal User Agent header', function (t) {
  t.plan(2);
  const restore = mockNodeVersion(null);
  const {http, fetch} = prepare();

  http.get('/test')
  .then(() => {
    const headers = fetch.firstCall.args[1].headers;
    const userAgent = headers['X-Contentful-User-Agent'];
    t.equal(headers['X-Test'], 'yes');
    t.equal(userAgent, 'app contentful.cf-graphql;');
    restore();
  });
});

test('http-client: User Agent OS and platform header', function (t) {
  t.plan(1);
  stubs.platform.returns('darwin');
  stubs.release.returns('x.y.z');
  const restore = mockNodeVersion('10.0.0');
  const {http, fetch} = prepare();

  http.get('/test')
  .then(() => {
    const userAgent = fetch.firstCall.args[1].headers['X-Contentful-User-Agent'];
    t.deepEqual(userAgent.split('; '), [
      'app contentful.cf-graphql',
      'os macOS/x.y.z',
      'platform node.js/10.0.0;'
    ]);
    restore();
  });
});
