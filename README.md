# cf-graphql

[![travis build](https://img.shields.io/travis/jelz/cf-graphql.svg)](https://travis-ci.org/jelz/cf-graphql)
[![npm](https://img.shields.io/npm/v/cf-graphql.svg)](https://www.npmjs.com/package/cf-graphql)
[![npm downloads](https://img.shields.io/npm/dt/cf-graphql.svg)](https://www.npmjs.com/package/cf-graphql)
[![deps status](https://img.shields.io/david/jelz/cf-graphql.svg)](https://david-dm.org/jelz/cf-graphql)
[![dev deps status](https://img.shields.io/david/dev/jelz/cf-graphql.svg)](https://david-dm.org/jelz/cf-graphql?type=dev)
[![codecov coverage](https://img.shields.io/codecov/c/github/jelz/cf-graphql.svg)](https://codecov.io/gh/jelz/cf-graphql)

`cf-graphql` is a library that allows you to query your data stored in
[Contentful](https://www.contentful.com/) with [GraphQL](http://graphql.org/).
A schema and value resolvers are automatically generated out of an existing
space.

Generated artifacts can be used with any node-based GraphQL server. The outcome
of the project's main function call is an instance of the
[`GraphQLSchema`](http://graphql.org/graphql-js/type/#graphqlschema) class.

## First steps

If you just want to see how it works, please follow the [Example](#example)
section. If you want to get your hands dirty, install the package:

```
npm install --save cf-graphql
```

... and follow the [Usage](#usage) section.


## Example

This repository contains a project example. To run it, clone the repo and
execute:

```
nvm use
npm install
npm run example-server
```

Navigate to <http://localhost:4000> to access an IDE (GraphiQL). You can query
[a pregenerated schema](./example/resources/schema.graphql) of my space there.
Please refer the [Querying](#querying) section. Here is how its graph looks
like:

![Schema graph](./example/resources/graph.png)

To use your own Contentful space with the example, you have to provide both
a space ID and its CDA token. As the last step, the schema needs to be
regenerated:

```
vi example/resources/config.json
npm run example-prepare
npm run example-server
```


## Usage

Let's assume we've required this module like this:
`const cfGraphql = require('cf-graphql')`. To create a schema out of your space
you need to call `cfGraphgl.createSchema(spaceContentTypes)`.

What are `spaceContentTypes`? It is an array containing descriptions of content types of your space which additinally provide some extra pieces of information
allowing the library to create a graph-like data structure. You can
[see an example here](./example/resources/cts.json).

Of course producing such a file is a tedious task, especially for larger spaces.
Fortunately you're covered here, you can use `cfGraphql.prepareCts`:

```js
const client = cfGraphql.createClient({
  spaceId: 'some-space-id',
  cdaToken: 'its-cda-token'
});

client.getContentTypes()
.then(cfGraphql.prepareCts)
.then(cts => {
  // `cts` can be passed to `cfGraphql.createSchema`!
});
```

([See a full example](./example/prepare-cts.js))

The last step is to use the schema with some server. A popular choice is
[express-graphql](https://github.com/graphql/express-graphql). The only caveat
is how the context is constructed. The library expects the `entryLoader` key of
the context to be set to an instance created with `client.createEntryLoader()`:

```js
// skipped: `require` calls, Express app setup, `client` creation

// `cts` were fetched and prepared in the previous snippet:
const schema = cfGraphql.createSchema(cts);
// BTW, you shouldn't be doing it per request, once is fine

app.use('/graphql', graphqlHTTP(() => ({
  schema,
  context: {entryLoader: client.createEntryLoader()}
})));
```

([Again, you can see a fully-fledged exmaple here](./example/server.js))


## Querying

For each content type there are two root-level fields:

- a singular field accepts a required `id` argument and resolves to a single
  entity
- a collection field accepts an optional `q` argument and resolves to a list
  of entities; the `q` arg is a query string you could use with the
  [CDA](https://www.contentful.com/developers/docs/references/content-delivery-api/)

Assuming you've got two content types named `post` and `author` this query is
valid:

```graphql
{
  authors {
    name
  }

  posts(q: "fields.rating[gt]=5") {
    title
    rating
  }

  post(id: "some-post-id") {
    title
    author
    comments
  }
}
```

Reference fields will be resolved to:

- a specific type if there is a validation that allows entries of only specific
  content type to be linked
- `EntryType` if there is not such a constraint. `EntryType` is and interface
  implemented by all the specfic types

Example where `author` field links only entries of one content type, `related`
field links entries of multiple content types:

```graphql
{
  posts {
    author {
      name
      website
    }

    related {
      ... on Tag {
        tagName
      }
      ... on Place {
        location
        name
      }
    }
  }
}
```

Backreferences are automatically created. Assume our `post` content type links
to the `author` content type via a field called `author`. Getting an author of
a post is easy, getting a list of posts by author is not. Unless you'll use
`_backrefs`:

```graphql
{
  authors {
    _backrefs {
      posts__via__author {
        title
      }
    }
  }
}
```

When using backreferences, there is a couple of things to keep in mind:

- backrefs may be slow; always test with a dataset which is comparable with what
  you've got in production
- backrefs are generated only when link specifies a single allowed content type
- `_backrefs` is prefixed with a single underscore
- `__via__` is surrounded with two underscores; this name makes sense for me
  ("get posts that link to author via the _author_ field") but of course it can
  be renamed, just tweak `backrefFieldName` in an array passed to `createSchema`


## Contributing

Please do. Open an issue/PR and optionally ping @jelz.


## License

MIT
