"use client";

import { Link, navigate } from "@rwgql/router";
import { routes } from "@/routes";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-hot-toast";

import { FindContactByIdDocument } from "@/components/Contact/ContactCell/ContactCell";
import { timeTag } from "@/lib/formatters";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

const DeleteContactMutationDocument = graphql(`
  mutation DeleteContactMutation($id: Int!) {
    deleteContact(id: $id) {
      id
    }
  }
`);

type ContactData = NonNullable<ResultOf<typeof FindContactByIdDocument>["contact"]>;

interface Props {
  contact: ContactData;
}

const Contact = ({ contact }: Props) => {
  const [deleteContact] = useMutation(DeleteContactMutationDocument, {
    onCompleted: () => {
      toast.success("Contact deleted");
      navigate(routes.contacts());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onDeleteClick = (id: VariablesOf<typeof DeleteContactMutationDocument>["id"]) => {
    if (confirm("Are you sure you want to delete contact " + id + "?")) {
      void deleteContact({ variables: { id } });
    }
  };

  return (
    <>
      <div className="rw-segment">
        <header className="rw-segment-header">
          <h2 className="rw-heading rw-heading-secondary">Contact {contact.id} Detail</h2>
        </header>
        <table className="rw-table">
          <tbody>
            <tr>
              <th>Id</th>
              <td>{contact.id}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{contact.name}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>{contact.email}</td>
            </tr>
            <tr>
              <th>Message</th>
              <td>{contact.message}</td>
            </tr>
            <tr>
              <th>Created at</th>
              <td>{timeTag(contact.createdAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav className="rw-button-group">
        <Link to={routes.editContact({ id: contact.id })} className="rw-button rw-button-blue">
          Edit
        </Link>
        <button
          type="button"
          className="rw-button rw-button-red"
          onClick={() => onDeleteClick(contact.id)}
        >
          Delete
        </button>
      </nav>
    </>
  );
};

export default Contact;
