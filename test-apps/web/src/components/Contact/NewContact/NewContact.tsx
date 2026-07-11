"use client";

import { navigate } from "@rwgql/router";
import { routes } from "@/routes";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-hot-toast";

import ContactForm from "@/components/Contact/ContactForm/ContactForm";
import { graphql } from "@/gql";
import type { CreateContactInput } from "@/gql/graphql";

const CreateContactMutationDocument = graphql(`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`);

const NewContact = () => {
  const [createContact, { loading, error }] = useMutation(CreateContactMutationDocument, {
    onCompleted: () => {
      toast.success("Contact created");
      navigate(routes.contacts());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSave = (input: CreateContactInput) => {
    void createContact({ variables: { input } });
  };

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">New Contact</h2>
      </header>
      <div className="rw-segment-main">
        <ContactForm onSave={onSave} loading={loading} error={error} />
      </div>
    </div>
  );
};

export default NewContact;
