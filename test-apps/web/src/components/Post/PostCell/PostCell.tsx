"use client";

import { createCell } from "@rwgql/cell";

import type { CellSuccessProps, CellFailureProps } from "@app/types/cell";

import Post from "@/components/Post/Post/Post";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

export const FindPostByIdDocument = graphql(`
  query FindPostById($id: Int!) {
    post: post(id: $id) {
      id
      title
      body
      authorId
      createdAt
    }
  }
`);

export const QUERY = FindPostByIdDocument;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => <div>Post not found</div>;

export const Failure = ({ error }: CellFailureProps<VariablesOf<typeof FindPostByIdDocument>>) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({
  post,
}: CellSuccessProps<
  ResultOf<typeof FindPostByIdDocument>,
  VariablesOf<typeof FindPostByIdDocument>
>) => {
  if (!post) {
    return <Empty />;
  }

  return <Post post={post} />;
};

export default createCell<
  ResultOf<typeof FindPostByIdDocument>,
  VariablesOf<typeof FindPostByIdDocument>
>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
