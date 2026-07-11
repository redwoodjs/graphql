/** Scalar mappings for the GraphQL client preset (browser-facing types). */
export const clientScalars = {
  DateTime: "string",
} as const;

/** Scalar mappings for server resolver typegen (Yoga / service layer). */
export const resolverScalars = {
  DateTime: { input: "Date", output: "Date | string" },
} as const;
