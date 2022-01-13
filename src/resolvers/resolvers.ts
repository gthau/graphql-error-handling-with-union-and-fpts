import { Resolvers } from '../generated/graphql';
import { getEntity, isUserAllowedForEntity, getUser } from '../data/service';

export const queryResolvers: Resolvers = {
  Query: {
    hello: () => 'World',

    entity: (_, args, __) => {
      const { id: entityId, userId } = args;
      const entity = getEntity(Number(entityId));
      const user = getUser(Number(userId));

      return (!entity || !user)
        ? null
        : isUserAllowedForEntity(user, entity)
          ? entity
          : null;
    }
  },

  Entity: {
    id: (parent) => String(parent.id),
    name: (parent) => parent.name,
  }
};
