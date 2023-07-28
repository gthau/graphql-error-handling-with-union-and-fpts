import * as A from 'fp-ts/lib/Array';
import * as E from 'fp-ts/lib/Either';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import { ErrorWithCause } from 'pony-cause';
import { InvalidInputError, NotAllowedError, NotFoundError, UnknownError } from '../errors/errors';
import { Type, isWrappedError, taskWrappedError, wrappedError, wrappedErrorField } from '../errors/wrapped-error';
import { Resolvers } from '../generated/graphql';
import { getEntitiesFromDataloader, getUsersFromDataloader } from '../model/dataloader';
import { getEntityForUser } from '../model/service';
import { Entity, User } from '../model/types';
import { validate, validateIsNumber, validateIsUserId } from './validation';

const errorTypesCommonResolvers = <E extends ErrorWithCause<Error>>(errorClass: Type<E>) => ({
  __isTypeOf: isWrappedError(errorClass),
  message: wrappedErrorField(errorClass)('message'),
});

export const queryResolvers: Resolvers = {
  Query: {
    hello: () => 'World',

    entity: (_, args, __) => {
      const { id: entityId, userId } = args;

      const validatedInputs = validate({
        entityId: validateIsNumber(entityId, 'entityId'),
        userId: validateIsUserId(userId, 'userId'),
      });

      return pipe(
        validatedInputs,
        TE.fromEither,
        TE.chain(({ entityId, userId }) => getEntityForUser(Number(entityId), userId)),
        TE.foldW(
          taskWrappedError,
          T.of,
        )
      )();
    },

    entities: (_, args, __) => {
      const { ids } = args;

      return pipe(
        ids,
        A.map(Number),
        getEntitiesFromDataloader,
        T.map(A.map(E.getOrElseW(wrappedError)))
      )();
    },

    users: (_, args, __) => {
      const { ids } = args;

      return pipe(
        ids,
        getUsersFromDataloader,
        T.map(A.map(E.getOrElseW(wrappedError)))
      )();
    }
  },

  Entity: {
    __isTypeOf: (parent) => parent instanceof Entity,
    id: (parent) => String(parent.id),
    name: (parent) => parent.name,
  },

  User: {
    __isTypeOf: (parent) => parent instanceof User,
    id: (parent) => String(parent.id),
    name: (parent) => parent.name,
    country: (parent) => parent.country,
  },

  NotFoundError: errorTypesCommonResolvers(NotFoundError),
  NotAllowedError: errorTypesCommonResolvers(NotAllowedError),
  UnknownError: errorTypesCommonResolvers(UnknownError),
  InvalidInputError: {
    ...errorTypesCommonResolvers(InvalidInputError),
    inputs: wrappedErrorField(InvalidInputError)('validations'),
  },
};
