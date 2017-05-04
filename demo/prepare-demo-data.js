'use strict';

// This script prepares a space graph and saves it in the repository so the
// example can be run w/o providing credentials
//
// The "demo-data.json" file should be commited.
//
// This script should be used by cf-graphql contributors only. If you want to
// build on top of cf-graphql, please see the "server.js" file.

const fs = require('fs');
const path = require('path');

const cfGraphql = require('..');

const spaceId = process.env.SPACE_ID;
const cdaToken = process.env.CDA_TOKEN;
const cmaToken = process.env.CMA_TOKEN;

const client = cfGraphql.createClient({spaceId, cdaToken, cmaToken});

client.getContentTypes()
.then(cfGraphql.prepareSpaceGraph)
.then(spaceGraph => {
  const content = JSON.stringify({spaceId, cdaToken, spaceGraph}, null, 2);
  fs.writeFileSync(path.join(__dirname, 'demo-data.json'), content, 'utf8');
  console.log('Demo data saved');
})
.catch(err => {
  console.log(err);
  process.exit(1);
});
