import { createValidatorDirective } from "@rwgql/auth/graphql";

export const schema = `
  directive @skipAuth on FIELD_DEFINITION
`;

const skipAuth = createValidatorDirective(schema, () => undefined);

export default skipAuth;
