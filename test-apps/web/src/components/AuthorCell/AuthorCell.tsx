"use client";

import { createCell } from "@rwgql/cell";

import type { CellSuccessProps, CellFailureProps } from "@app/types/cell";

import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

export const FindAuthorQueryDocument = graphql(`
  query FindAuthorQuery($id: Int!) {
    author: user(id: $id) {
      email
      fullName
    }
  }
`);

export const QUERY = FindAuthorQueryDocument;

export const Loading = () => <span>Loading...</span>;

export const Empty = () => <span>Empty</span>;

export const Failure = ({
  error,
}: CellFailureProps<VariablesOf<typeof FindAuthorQueryDocument>>) => (
  <span style={{ color: "red" }}>Error: {error?.message}</span>
);

export const Success = ({
  author,
}: CellSuccessProps<
  ResultOf<typeof FindAuthorQueryDocument>,
  VariablesOf<typeof FindAuthorQueryDocument>
>) => {
  if (!author) {
    return <Empty />;
  }

  return (
    <span className="author-cell">
      {author.fullName} ({author.email})
    </span>
  );
};

export default createCell<
  ResultOf<typeof FindAuthorQueryDocument>,
  VariablesOf<typeof FindAuthorQueryDocument>
>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
