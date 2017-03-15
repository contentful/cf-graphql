# cf-graphql

## Local development

Setup:

```
nvm use
npm install
vi config.json
npm run get-cts
```

Run:

```
npm start # and go to http://localhost:4000
```

## AWS Lambda

Prepare a zip file:

```
npm run zip
du -h dist/lambda-cf-graphql.zip # yay! small!
```

Handlers:
- `lambda.ui` serves the [GraphiQL](https://github.com/graphql/graphiql) UI
- `lambda.graphql` is the default [graphql-server-lambda](https://github.com/apollographql/graphql-server#aws-lambda) handler

## Known issues

- [ ] Name generation logic may cause conflicts, no checks implemented
- [ ] GraphiQL uses externally hosted scripts only and does not polyfill anything - tested only in FF52 and Ch56
- [x] Not all Contentful field types are mapped properly (especially Asset links)
- [x] Firing waaay too many requests, not making use of includes, no caching

## To migrate from the initial solution

- [ ] `q` (query string part) argument for collections
- [ ] backreferences
