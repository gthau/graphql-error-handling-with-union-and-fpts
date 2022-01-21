import { pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { getEntityForUser } from '../model/service';
import { Entity } from '../model/types';
import { InvalidInputError, NotAllowedError, NotFoundError, UnknownError } from '../errors/errors';
import { isWrappedError, taskWrappedError, Type, wrappedErrorMsg } from '../errors/wrapped-error';
import { Resolvers } from '../generated/graphql';
import { ErrorWithCause } from 'pony-cause';

const errorTypesCommonResolvers = <E extends ErrorWithCause<Error>>(errorClass: Type<E>) => ({
  __isTypeOf: isWrappedError(errorClass),
  message: wrappedErrorMsg,
});

export const queryResolvers: Resolvers = {
  Query: {
    hello: () => 'World',

    entity: (_, args, __) => {
      const { id: entityId, userId } = args;

      return pipe(
        getEntityForUser(Number(entityId), Number(userId)),
        TE.foldW(
          taskWrappedError,
          T.of,
        )
      )();
    }
  },

  Entity: {
    __isTypeOf: (parent) => parent instanceof Entity,
    id: (parent) => String(parent.id),
    name: (parent) => parent.name,
  },

  NotFoundError: {
    ...errorTypesCommonResolvers(NotFoundError),
  },
  NotAllowedError: {
    ...errorTypesCommonResolvers(NotAllowedError),
  },
  InvalidInputError: {
    ...errorTypesCommonResolvers(InvalidInputError),
  },
  UnknownError: {
    ...errorTypesCommonResolvers(UnknownError),
  },
};
