import { createValidatorDirective, type ValidatorDirectiveFunc } from "@rwgql/auth/graphql";

import { type AuthContext, requireAuth as applicationRequireAuth } from "../../auth/auth.ts";

export const schema = `
  directive @requireAuth(roles: [String]) on FIELD_DEFINITION
`;

const validate: ValidatorDirectiveFunc<{ roles?: string[] }> = ({ context, directiveArgs }) => {
  applicationRequireAuth(context as AuthContext, { roles: directiveArgs.roles });
};

const requireAuth = createValidatorDirective(schema, validate);

export default requireAuth;
