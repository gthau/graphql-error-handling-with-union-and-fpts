import { pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/lib/Task';

export interface Type<T> extends Function {
  new(...args: any[]): T;
}

export type WrappedError<E extends Error> = { err: NonNullable<E> };

export const wrappedError = <E extends Error>(err: E) => ({ err });

export const isWrappedError =
  <E extends Error>(errorClass: Type<E>) =>
    (v: unknown): v is WrappedError<E> => (
      typeof v === 'object'
      && v !== null
      && v !== undefined
      && 'err' in v
      && (v as WrappedError<E>).err instanceof errorClass
    );

export const wrappedErrorMsg = <E extends Error>(wrappedErr: WrappedError<E>) => wrappedErr.err.message;

export const taskWrappedError = <E extends Error>(err: E) => pipe(err, wrappedError, T.of);
