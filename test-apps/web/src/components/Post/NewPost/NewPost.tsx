"use client";

import { navigate } from "@rwgql/router";
import { routes } from "@/routes";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-hot-toast";

import PostForm from "@/components/Post/PostForm/PostForm";
import { graphql } from "@/gql";
import type { CreatePostInput } from "@/gql/graphql";

const CreatePostMutationDocument = graphql(`
  mutation CreatePostMutation($input: CreatePostInput!) {
    createPost(input: $input) {
      id
    }
  }
`);

const NewPost = () => {
  const [createPost, { loading, error }] = useMutation(CreatePostMutationDocument, {
    onCompleted: () => {
      toast.success("Post created");
      navigate(routes.posts());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSave = (input: CreatePostInput) => {
    void createPost({ variables: { input } });
  };

  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">New Post</h2>
      </header>
      <div className="rw-segment-main">
        <PostForm onSave={onSave} loading={loading} error={error} />
      </div>
    </div>
  );
};

export default NewPost;
