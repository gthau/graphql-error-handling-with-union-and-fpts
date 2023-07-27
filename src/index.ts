import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadSchema } from '@graphql-tools/load';
import { addResolversToSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { queryResolvers as resolvers } from './resolvers/resolvers';

async function main() {
  const schema = await loadSchema('./src/typedefs.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
  const schemaWithResolvers = addResolversToSchema({ schema, resolvers });

  const yoga = createYoga({
    schema: schemaWithResolvers,
  });
  const server = createServer(yoga);

  server.listen(4000, () => {
    console.log('Server is running on http://localhost:4000');
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
