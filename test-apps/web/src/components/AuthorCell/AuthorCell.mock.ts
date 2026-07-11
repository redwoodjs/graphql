export const standard = () => ({
  author: {
    __typename: "User" as const,
    email: "fortytwo@42.com",
    fullName: "Forty Two",
    id: 42,
  },
});
