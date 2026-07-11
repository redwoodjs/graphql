"use client";

import { useState } from "react";

import { useForm } from "react-hook-form";

import { Form, TextField, TextAreaField, Submit, FieldError, Label } from "@/lib/forms";
import { useBlocker } from "@rwgql/router";
import { useMutation } from "@apollo/client/react";
import { toast, Toaster } from "react-hot-toast";

import { graphql } from "@/gql";
import type { CreateContactInput } from "@/gql/graphql";

const CreateContactMutationDocument = graphql(`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`);

const ContactUsPage = () => {
  const formMethods = useForm<CreateContactInput>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const blocker = useBlocker({
    when: formMethods.formState.isDirty && !isSubmitting,
  });

  const [create, { loading, error }] = useMutation(CreateContactMutationDocument, {
    onCompleted: () => {
      toast.success("Thank you for your submission!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: CreateContactInput) => {
    setIsSubmitting(true);
    try {
      await create({ variables: { input: data } });
      formMethods.reset(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Toaster toastOptions={{ className: "rw-toast", duration: 6000 }} />
      <Form onSubmit={onSubmit} formMethods={formMethods} config={{ mode: "onBlur" }} error={error}>
        {blocker.state === "BLOCKED" ? (
          <div>
            <button type="button" onClick={() => blocker.confirm()}>
              Confirm
            </button>
            <button type="button" onClick={() => blocker.abort()}>
              Abort
            </button>
          </div>
        ) : null}

        <Label
          name="name"
          className="block text-sm uppercase text-gray-700"
          errorClassName="block uppercase text-sm text-red-700"
        >
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          className="rounded-sm border px-2 py-1 outline-none"
          errorClassName="border rounded-sm px-2 py-1 border-red-700 outline-none"
        />
        <FieldError name="name" className="block text-red-700" />

        <Label
          name="email"
          className="mt-8 block text-sm uppercase text-gray-700"
          errorClassName="block mt-8 text-red-700 uppercase text-sm"
        >
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /[^@]+@[^.]+..+/,
              message: "Please enter a valid email address",
            },
          }}
          className="rounded-sm border px-2 py-1"
          errorClassName="border rounded-sm px-2 py-1 border-red-700 outline-none"
        />
        <FieldError name="email" className="block text-red-700" />

        <Label
          name="message"
          className="mt-8 block text-sm uppercase text-gray-700"
          errorClassName="block mt-8 text-red-700 uppercase text-sm"
        >
          Message
        </Label>
        <TextAreaField
          name="message"
          validation={{ required: true }}
          className="block rounded-sm border px-2 py-1"
          errorClassName="block border rounded-sm px-2 py-1 border-red-700 outline-none"
        />
        <FieldError name="message" className="block text-red-700" />

        <Submit className="mt-8 block rounded bg-blue-700 px-4 py-2 text-white" disabled={loading}>
          Save
        </Submit>
      </Form>
    </>
  );
};

export default ContactUsPage;
