import type { GraphQLResolveInfo } from "graphql";

export type CustomResolverType<TResult, TParent, TContext, TArgs> = (
  args: TArgs,
  obj: { root: TParent; context?: TContext; info?: GraphQLResolveInfo },
) => TResult | Promise<TResult>;

export type ServiceResolver<T> = NonNullable<T>;
