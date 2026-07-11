"use client";

import EditPostCell from "@/components/Post/EditPostCell/EditPostCell";

type PostPageProps = {
  id: number;
};

const EditPostPage = ({ id }: PostPageProps) => {
  return <EditPostCell id={id} />;
};

export default EditPostPage;
