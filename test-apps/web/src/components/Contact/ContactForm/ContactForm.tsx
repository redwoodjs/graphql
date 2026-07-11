"use client";

import type { RWGqlError } from "@/lib/forms";
import { Form, FormError, FieldError, Label, TextField, Submit } from "@/lib/forms";

import { EditContactByIdDocument } from "@/components/Contact/EditContactCell/EditContactCell";
import type { ResultOf } from "@graphql-typed-document-node/core";
import type { CreateContactInput } from "@/gql/graphql";

type FormContact = NonNullable<ResultOf<typeof EditContactByIdDocument>["contact"]>;

interface ContactFormProps {
  contact?: ResultOf<typeof EditContactByIdDocument>["contact"];
  onSave: (data: CreateContactInput, id?: FormContact["id"]) => void;
  error: RWGqlError;
  loading: boolean;
}

const ContactForm = (props: ContactFormProps) => {
  const onSubmit = (data: CreateContactInput) => {
    props.onSave(data, props?.contact?.id);
  };

  return (
    <div className="rw-form-wrapper">
      <Form<CreateContactInput> onSubmit={onSubmit} error={props.error}>
        <FormError
          error={props.error}
          wrapperClassName="rw-form-error-wrapper"
          titleClassName="rw-form-error-title"
          listClassName="rw-form-error-list"
        />

        <Label name="name" className="rw-label" errorClassName="rw-label rw-label-error">
          Name
        </Label>

        <TextField
          name="name"
          defaultValue={props.contact?.name}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="name" className="rw-field-error" />

        <Label name="email" className="rw-label" errorClassName="rw-label rw-label-error">
          Email
        </Label>

        <TextField
          name="email"
          defaultValue={props.contact?.email}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="email" className="rw-field-error" />

        <Label name="message" className="rw-label" errorClassName="rw-label rw-label-error">
          Message
        </Label>

        <TextField
          name="message"
          defaultValue={props.contact?.message}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="message" className="rw-field-error" />

        <div className="rw-button-group">
          <Submit disabled={props.loading} className="rw-button rw-button-blue">
            Save
          </Submit>
        </div>
      </Form>
    </div>
  );
};

export default ContactForm;
