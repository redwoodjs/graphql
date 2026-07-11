"use client";

import { Link, navigate } from "@rwgql/router";
import { routes } from "@/routes";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-hot-toast";

import { FindPostByIdDocument } from "@/components/Post/PostCell/PostCell";
import { timeTag } from "@/lib/formatters";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

const DeletePostMutationDocument = graphql(`
  mutation DeletePostMutation($id: Int!) {
    deletePost(id: $id) {
      id
    }
  }
`);

type PostData = NonNullable<ResultOf<typeof FindPostByIdDocument>["post"]>;

interface Props {
  post: PostData;
}

const Post = ({ post }: Props) => {
  const [deletePost] = useMutation(DeletePostMutationDocument, {
    onCompleted: () => {
      toast.success("Post deleted");
      navigate(routes.posts());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onDeleteClick = (id: VariablesOf<typeof DeletePostMutationDocument>["id"]) => {
    if (confirm("Are you sure you want to delete post " + id + "?")) {
      void deletePost({ variables: { id } });
    }
  };

  return (
    <>
      <div className="rw-segment">
        <header className="rw-segment-header">
          <h2 className="rw-heading rw-heading-secondary">Post {post.id} Detail</h2>
        </header>
        <table className="rw-table">
          <tbody>
            <tr>
              <th>Id</th>
              <td>{post.id}</td>
            </tr>
            <tr>
              <th>Title</th>
              <td>{post.title}</td>
            </tr>
            <tr>
              <th>Body</th>
              <td>{post.body}</td>
            </tr>
            <tr>
              <th>Author id</th>
              <td>{post.authorId}</td>
            </tr>
            <tr>
              <th>Created at</th>
              <td>{timeTag(post.createdAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav className="rw-button-group">
        <Link to={routes.editPost({ id: post.id })} className="rw-button rw-button-blue">
          Edit
        </Link>
        <button
          type="button"
          className="rw-button rw-button-red"
          onClick={() => onDeleteClick(post.id)}
        >
          Delete
        </button>
      </nav>
    </>
  );
};

export default Post;
