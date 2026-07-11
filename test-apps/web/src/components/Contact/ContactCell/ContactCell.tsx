"use client";

import { createCell } from "@rwgql/cell";

import type { CellSuccessProps, CellFailureProps } from "@app/types/cell";

import Contact from "@/components/Contact/Contact/Contact";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

export const FindContactByIdDocument = graphql(`
  query FindContactById($id: Int!) {
    contact: contact(id: $id) {
      id
      name
      email
      message
      createdAt
    }
  }
`);

export const QUERY = FindContactByIdDocument;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => <div>Contact not found</div>;

export const Failure = ({
  error,
}: CellFailureProps<VariablesOf<typeof FindContactByIdDocument>>) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({
  contact,
}: CellSuccessProps<
  ResultOf<typeof FindContactByIdDocument>,
  VariablesOf<typeof FindContactByIdDocument>
>) => {
  if (!contact) {
    return <Empty />;
  }

  return <Contact contact={contact} />;
};

export default createCell<
  ResultOf<typeof FindContactByIdDocument>,
  VariablesOf<typeof FindContactByIdDocument>
>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
