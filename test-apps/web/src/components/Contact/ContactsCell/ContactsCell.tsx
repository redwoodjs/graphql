"use client";

import { createCell } from "@rwgql/cell";

import { Link } from "@rwgql/router";
import { routes } from "@/routes";
import type { CellSuccessProps, CellFailureProps } from "@app/types/cell";

import Contacts from "@/components/Contact/Contacts/Contacts";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

export const FindContactsDocument = graphql(`
  query FindContacts {
    contacts {
      id
      name
      email
      message
      createdAt
    }
  }
`);

export const QUERY = FindContactsDocument;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => {
  return (
    <div className="rw-text-center">
      No contacts yet.{" "}
      <Link to={routes.newContact()} className="rw-link">
        Create one?
      </Link>
    </div>
  );
};

export const Failure = ({ error }: CellFailureProps<VariablesOf<typeof FindContactsDocument>>) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({
  contacts,
}: CellSuccessProps<
  ResultOf<typeof FindContactsDocument>,
  VariablesOf<typeof FindContactsDocument>
>) => {
  return <Contacts contacts={contacts} />;
};

export default createCell<
  ResultOf<typeof FindContactsDocument>,
  VariablesOf<typeof FindContactsDocument>
>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
