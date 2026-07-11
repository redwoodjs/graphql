"use client";

import type { RWGqlError } from "@/lib/forms";
import { Form, FormError, FieldError, Label, TextField, NumberField, Submit } from "@/lib/forms";

import type { ResultOf } from "@graphql-typed-document-node/core";
import type { CreatePostInput } from "@/gql/graphql";

import { EditPostByIdDocument } from "@/components/Post/EditPostCell/EditPostCell";

type FormPost = NonNullable<ResultOf<typeof EditPostByIdDocument>["post"]>;

interface PostFormProps {
  post?: ResultOf<typeof EditPostByIdDocument>["post"];
  onSave: (data: CreatePostInput, id?: FormPost["id"]) => void;
  error: RWGqlError;
  loading: boolean;
}

const PostForm = (props: PostFormProps) => {
  const onSubmit = (data: CreatePostInput) => {
    props.onSave(data, props?.post?.id);
  };

  return (
    <div className="rw-form-wrapper">
      <Form<CreatePostInput> onSubmit={onSubmit} error={props.error}>
        <FormError
          error={props.error}
          wrapperClassName="rw-form-error-wrapper"
          titleClassName="rw-form-error-title"
          listClassName="rw-form-error-list"
        />

        <Label name="title" className="rw-label" errorClassName="rw-label rw-label-error">
          Title
        </Label>

        <TextField
          name="title"
          defaultValue={props.post?.title}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="title" className="rw-field-error" />

        <Label name="body" className="rw-label" errorClassName="rw-label rw-label-error">
          Body
        </Label>

        <TextField
          name="body"
          defaultValue={props.post?.body}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="body" className="rw-field-error" />

        <Label name="authorId" className="rw-label" errorClassName="rw-label rw-label-error">
          Author id
        </Label>

        <NumberField
          name="authorId"
          defaultValue={props.post?.authorId}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="authorId" className="rw-field-error" />

        <div className="rw-button-group">
          <Submit disabled={props.loading} className="rw-button rw-button-blue">
            Save
          </Submit>
        </div>
      </Form>
    </div>
  );
};

export default PostForm;
