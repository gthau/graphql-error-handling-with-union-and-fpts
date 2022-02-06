import * as T from 'fp-ts/lib/Task';

export interface Type<T> extends Function {
  new(...args: any[]): T;
}

export type WrappedError<E extends Error> = {
  _tag: 'WrappedError';
  err: NonNullable<E>;
};

export const wrappedError = <E extends Error>(err: E) => ({
  _tag: 'WrappedError',
  err,
});

export const isWrappedError =
  <E extends Error>(errorClass: Type<E>) =>
    (v: any): v is WrappedError<E> => (
      v?._tag === 'WrappedError' &&
      v.err instanceof errorClass
    );

export const wrappedErrorField =
  <E extends Error>(errorClass: Type<E>) =>
    <TKey extends keyof E>(prop: TKey) =>
      (wrappedErr: WrappedError<E>): E[TKey] => wrappedErr.err[prop];

export const taskWrappedError = <E extends Error>(err: E) => T.of(wrappedError(err));
