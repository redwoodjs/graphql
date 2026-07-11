"use client";

import EditContactCell from "@/components/Contact/EditContactCell/EditContactCell";

type ContactPageProps = {
  id: number;
};

const EditContactPage = ({ id }: ContactPageProps) => {
  return <EditContactCell id={id} />;
};

export default EditContactPage;
