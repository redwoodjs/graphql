"use client";

import { createCell } from "@rwgql/cell";

import { navigate } from "@rwgql/router";
import { routes } from "@/routes";
import type { CellSuccessProps, CellFailureProps } from "@app/types/cell";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-hot-toast";

import ContactForm from "@/components/Contact/ContactForm/ContactForm";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import type { UpdateContactInput } from "@/gql/graphql";

export const EditContactByIdDocument = graphql(`
  query EditContactById($id: Int!) {
    contact: contact(id: $id) {
      id
      name
      email
      message
      createdAt
    }
  }
`);

const UpdateContactMutationDocument = graphql(`
  mutation UpdateContactMutation($id: Int!, $input: UpdateContactInput!) {
    updateContact(id: $id, input: $input) {
      id
      name
      email
      message
      createdAt
    }
  }
`);

export const QUERY = EditContactByIdDocument;

export const Loading = () => <div>Loading...</div>;

export const Failure = ({ error }: CellFailureProps) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({
  contact,
}: CellSuccessProps<ResultOf<typeof EditContactByIdDocument>>) => {
  const [updateContact, { loading, error }] = useMutation(UpdateContactMutationDocument, {
    onCompleted: () => {
      toast.success("Contact updated");
      navigate(routes.contacts());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSave = (
    input: UpdateContactInput,
    id?: NonNullable<ResultOf<typeof EditContactByIdDocument>["contact"]>["id"],
  ) => {
    if (id === undefined) {
      return;
    }

    void updateContact({ variables: { id, input } });
  };

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">Edit Contact {contact?.id}</h2>
      </header>
      <div className="rw-segment-main">
        <ContactForm contact={contact} onSave={onSave} error={error} loading={loading} />
      </div>
    </div>
  );
};

export default createCell<
  ResultOf<typeof EditContactByIdDocument>,
  VariablesOf<typeof EditContactByIdDocument>
>({
  QUERY,
  Loading,
  Failure,
  Success,
});
