import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  createNetworkInterface,
  ApolloClient,
  gql,
  graphql,
  ApolloProvider,
} from 'react-apollo';

const client = new ApolloClient({
  networkInterface: createNetworkInterface({
    uri: '/graphql/'
  })
});

const graphQLQuery = gql`
  {
    authors {
      name
    }
    categories {
      title
    }
    posts {
      title
    }
  }
`;

const getGraphQLEnhancedComponent = graphql(graphQLQuery);

const DataViewer = ({data: {loading, error, authors, categories, posts}}) => {
  if (loading) return <p>Loading ...</p>;
  if (error) return <p>{error.message}</p>;

  return (
    <div>
      <h2>Authors</h2>
      <ul>{authors.map(a => <li key={a.name}>{a.name}</li>)}</ul>
      <h2>Categories</h2>
      <ul>{categories.map(c =>  <li key={c.title}>{c.title}</li>)}</ul>
      <h2>Posts</h2>
      <ul>{posts.map(p => <li key={p.title}>{p.title}</li>)}</ul>
    </div>
  );
};

DataViewer.propTypes = {
  data: PropTypes.object
};

const DataViewerWithData = getGraphQLEnhancedComponent(DataViewer);

class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <div className="wrapper">
          <img src="/client/logo.png" alt="Contentful Logo" width="200"/>
          <h1>Using GraphQL with Contentful</h1>
          <p>This example shows you a GraphQL setup that relies on Contentful.
            If fetches all items for three different content types (author, category, post)
            which is normally only possible with three API calls.</p>
          <p>With the following GraphQL query it can be done with a single call.</p>
          <pre><code>
            {graphQLQuery.loc.source.body}
          </code></pre>
          <p>This demo uses <a href="https://facebook.github.io/react/">React</a> and <a href="https://www.apollodata.com/">the Apollo Framework</a>.</p>
          <hr/>
          <DataViewerWithData/>
        </div>
      </ApolloProvider>
    );
  }
}

export default App;
