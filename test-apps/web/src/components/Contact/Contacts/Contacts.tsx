"use client";

import { Link } from "@rwgql/router";
import { routes } from "@/routes";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-hot-toast";

import { FindContactsDocument, QUERY } from "@/components/Contact/ContactsCell/ContactsCell";
import { timeTag, truncate } from "@/lib/formatters";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

const DeleteContactMutationDocument = graphql(`
  mutation DeleteContactMutation($id: Int!) {
    deleteContact(id: $id) {
      id
    }
  }
`);

const ContactsList = ({ contacts }: ResultOf<typeof FindContactsDocument>) => {
  const [deleteContact] = useMutation(DeleteContactMutationDocument, {
    onCompleted: () => {
      toast.success("Contact deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    refetchQueries: [{ query: QUERY }],
    awaitRefetchQueries: true,
  });

  const onDeleteClick = (id: VariablesOf<typeof DeleteContactMutationDocument>["id"]) => {
    if (confirm("Are you sure you want to delete contact " + id + "?")) {
      void deleteContact({ variables: { id } });
    }
  };

  return (
    <div className="rw-segment rw-table-wrapper-responsive">
      <table className="rw-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Name</th>
            <th>Email</th>
            <th>Message</th>
            <th>Created at</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td>{truncate(contact.id)}</td>
              <td>{truncate(contact.name)}</td>
              <td>{truncate(contact.email)}</td>
              <td>{truncate(contact.message)}</td>
              <td>{timeTag(contact.createdAt)}</td>
              <td>
                <nav className="rw-table-actions">
                  <Link
                    to={routes.contact({ id: contact.id })}
                    title={"Show contact " + contact.id + " detail"}
                    className="rw-button rw-button-small"
                  >
                    Show
                  </Link>
                  <Link
                    to={routes.editContact({ id: contact.id })}
                    title={"Edit contact " + contact.id}
                    className="rw-button rw-button-small rw-button-blue"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    title={"Delete contact " + contact.id}
                    className="rw-button rw-button-small rw-button-red"
                    onClick={() => onDeleteClick(contact.id)}
                  >
                    Delete
                  </button>
                </nav>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContactsList;
