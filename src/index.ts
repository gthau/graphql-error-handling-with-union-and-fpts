import { GraphQLServer } from 'graphql-yoga';
import { queryResolvers as resolvers } from './resolvers/resolvers';

const server = new GraphQLServer({
  typeDefs: './src/typedefs.graphql',
  resolvers,
} as any);

server.start(() => console.log('Server is running on http://localhost:4000'))
