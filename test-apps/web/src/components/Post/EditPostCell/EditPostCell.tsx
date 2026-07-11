"use client";

import { createCell } from "@rwgql/cell";

import { navigate } from "@rwgql/router";
import { routes } from "@/routes";
import type { CellSuccessProps, CellFailureProps } from "@app/types/cell";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-hot-toast";

import PostForm from "@/components/Post/PostForm/PostForm";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import type { UpdatePostInput } from "@/gql/graphql";

export const EditPostByIdDocument = graphql(`
  query EditPostById($id: Int!) {
    post: post(id: $id) {
      id
      title
      body
      authorId
      createdAt
    }
  }
`);

const UpdatePostMutationDocument = graphql(`
  mutation UpdatePostMutation($id: Int!, $input: UpdatePostInput!) {
    updatePost(id: $id, input: $input) {
      id
      title
      body
      authorId
      createdAt
    }
  }
`);

export const QUERY = EditPostByIdDocument;

export const Loading = () => <div>Loading...</div>;

export const Failure = ({ error }: CellFailureProps) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({ post }: CellSuccessProps<ResultOf<typeof EditPostByIdDocument>>) => {
  const [updatePost, { loading, error }] = useMutation(UpdatePostMutationDocument, {
    onCompleted: () => {
      toast.success("Post updated");
      navigate(routes.posts());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSave = (
    input: UpdatePostInput,
    id?: NonNullable<ResultOf<typeof EditPostByIdDocument>["post"]>["id"],
  ) => {
    if (id === undefined) {
      return;
    }

    void updatePost({ variables: { id, input } });
  };

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">Edit Post {post?.id}</h2>
      </header>
      <div className="rw-segment-main">
        <PostForm post={post} onSave={onSave} error={error} loading={loading} />
      </div>
    </div>
  );
};

export default createCell<
  ResultOf<typeof EditPostByIdDocument>,
  VariablesOf<typeof EditPostByIdDocument>
>({
  QUERY,
  Loading,
  Failure,
  Success,
});
