import Dataloader from 'dataloader';
import * as A from 'fp-ts/lib/Array';
import * as E from 'fp-ts/lib/Either';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import { ErrorWithCause } from 'pony-cause';
import { ConnectionError, NotFoundError } from '../errors';
import { getEntities, getUsers } from './service';
import { Entity, User, UserId } from './types';


// (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;
async function userBatchFn(keys: readonly UserId[]) {
  console.log(`calling userBatchFn with keys=${JSON.stringify(keys)}`);

  // get users as an Array<TE<E, User>> and transform it to Task<Array<User | E>>
  const prog = pipe(
    keys as UserId[],
    getUsers,
    // TaskEither.toUnion: (v: TaskEither<E,A>) => Task<A | E>
    // same as `TE.foldW(T.of, T.of)` and `TE.getOrElseW(T.of)`
    A.map(TE.toUnion),
    T.sequenceArray,
  );

  // run pipe (and optionally await) result to satisfy the Dataloader.BatchLoadFn return type (Promise)
  return await prog();
}

export const userDataloader = new Dataloader<UserId, User | NotFoundError>(
  userBatchFn, {
    batch: true,
    // if we enable the cache, then we must deal with invalidation of the errors, e.g. not cache indefinitely:
    // - ConnectionErrors, which are temporary and can be cached with low TTL
    // - NotFoundError, which can be invalidated by listening to Entity creation events (e.g. from Redis, MQ, DB logs tailing, etc.)
    // it is not the purpose of this demo project to demonstrate this
    cache: false,
  });

export const getUsersFromDataloader = (ids: UserId[]): T.Task<E.Either<NotFoundError, User>[]> => {
  return pipe(
    () => userDataloader.loadMany(ids),
    T.map(A.map(eitherFromDataloaderResult<NotFoundError, User>))
  );
}

// (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;
async function entityBatchFn(keys: readonly number[]) {
  console.log(`calling entityBatchFn with keys=${JSON.stringify(keys)}`);

  const prog = pipe(
    keys as number[],
    getEntities,
    TE.map(A.map(E.toUnion)),
    TE.mapLeft((e) => A.replicate(keys.length, e)),
    TE.toUnion,
  );

  return await prog();
}

export const entityDataloader = new Dataloader<number, Entity | NotFoundError | ConnectionError>(
  entityBatchFn, {
    batch: true,
    // if we enable the cache, then we must deal with invalidation of the errors, e.g. not cache indefinitely:
    // - ConnectionErrors, which are temporary and can be cached with low TTL
    // - NotFoundError, which can be invalidated by listening to Entity creation events (e.g. from Redis, MQ, DB logs tailing, etc.)
    // it is not the purpose of this demo project to demonstrate this
    cache: false,
  });

export const getEntitiesFromDataloader = (ids: number[]): T.Task<E.Either<NotFoundError | ConnectionError, Entity>[]> => {
  return pipe(
    () => entityDataloader.loadMany(ids),
    T.map(A.map(eitherFromDataloaderResult<NotFoundError | ConnectionError, Entity>)),
  );
}

const eitherFromDataloaderResult =
  <SpecificError extends ErrorWithCause<Error>, T>(
    valueOrError: T | SpecificError | Error,
  ): E.Either<SpecificError, T> => {
    return valueOrError instanceof ErrorWithCause || valueOrError instanceof Error
      ? E.left(valueOrError as SpecificError) // Dataloader interface is too loose, we always get the error we return from the batch loading function
      : E.right(valueOrError)
  };
