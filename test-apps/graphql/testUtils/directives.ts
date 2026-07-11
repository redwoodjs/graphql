import type { GraphQLResolveInfo } from "graphql";

import type { ValidatorDirective } from "@rwgql/auth/graphql";

type MockValidatorDirectiveOptions = {
  readonly context?: Record<string, unknown>;
  readonly directiveArgs?: Record<string, unknown>;
};

export const mockValidatorDirective = (
  directive: ValidatorDirective,
  { context = {}, directiveArgs = {} }: MockValidatorDirectiveOptions = {},
) => {
  return () =>
    directive.onResolverCalled({
      args: {},
      context,
      directiveArgs,
      info: {} as GraphQLResolveInfo,
      root: {},
    });
};
