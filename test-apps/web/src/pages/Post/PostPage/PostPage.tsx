"use client";

import PostCell from "@/components/Post/PostCell/PostCell";

type PostPageProps = {
  id: number;
};

const PostPage = ({ id }: PostPageProps) => {
  return <PostCell id={id} />;
};

export default PostPage;
