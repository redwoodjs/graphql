"use client";

import ContactCell from "@/components/Contact/ContactCell/ContactCell";

type ContactPageProps = {
  id: number;
};

const ContactPage = ({ id }: ContactPageProps) => {
  return <ContactCell id={id} />;
};

export default ContactPage;
