import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/lib/TaskEither';
import { newErrorWithCause, NotAllowedError, NotFoundError } from '../errors/errors';
import { fetchEntity, fetchUser } from './throwing-api';
import { Entity, User } from './types';


export const getEntity = (id: number): TE.TaskEither<NotFoundError, Entity | undefined> =>
  TE.tryCatch(
    () => fetchEntity(id),
    newErrorWithCause(NotFoundError),
  );

export const getUser = (id: number): TE.TaskEither<Error, User | undefined> =>
  TE.tryCatch(
    () => fetchUser(id),
    newErrorWithCause(NotFoundError),
  );

export const isUserAllowedForEntity = (user: User, entity: Entity): boolean => !entity.restrictions.includes(user.country);

export const isUserAllowedForEntityAsError = (user: User, entity: Entity): E.Either<NotAllowedError, boolean> =>
  pipe(
    isUserAllowedForEntity(user, entity),
    E.fromPredicate(
      Boolean,
      (_) => new NotAllowedError(`User ${user.id} isn't allowed to access entity ${entity.id}`),
    )
  );

export const getEntityForUser = (id: number, userId: number): TE.TaskEither<NotFoundError | NotAllowedError, Entity | undefined> =>
  pipe(
    getUser(userId),
    TE.bindTo('user'),
    TE.bind('entity', (_) => getEntity(id)),
    TE.bind('isAllowed', ({ user, entity }) => TE.fromEither(isUserAllowedForEntityAsError(user, entity))),
    TE.map(({ entity }) => entity),
  );
