'use strict';

const path = require('path');
const fs = require('fs');

const graphql = require('graphql');
const cfGraphql = require('..');
const client = cfGraphql.createClient(require('./resources/config.json'));
const target = f => path.resolve(__dirname, 'resources', f);

client.getContentTypes()
.then(cfGraphql.prepareCts)
.then(save).catch(fail);

function save (cts) {
  const schema = cfGraphql.createSchema(cts);
  fs.writeFileSync(target('schema.graphql'), graphql.printSchema(schema));
  fs.writeFileSync(target('cts.json'), JSON.stringify(cts, null, 2));

  console.log(
    'Contentful content types saved:',
    cts.map(ct => ct.names.type).join(', ')
  );
}

function fail (err) {
  console.log(err);
  process.exit(1);
}
