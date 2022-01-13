import { Resolvers } from '../generated/graphql';

export const queryResolvers: Resolvers = {
  Query: {
    hello: () => 'World',
    queryWithArgs: (_, {arg1, arg2}, context) => `Hello ${arg1} ${arg2 ?? 1}`,
  },
};
