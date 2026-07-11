import { db } from "db";
import type { Prisma } from "db";

import type { MutationResolvers, QueryResolvers } from "types/graphql";
import type { ServiceResolver } from "@rwgql/graphql-typegen";

export const contacts: ServiceResolver<QueryResolvers["contacts"]> = () => db.contact.findMany();

export const contact: ServiceResolver<QueryResolvers["contact"]> = ({ id }) =>
  db.contact.findUnique({
    where: { id },
  });

export const createContact: ServiceResolver<MutationResolvers["createContact"]> = ({ input }) =>
  db.contact.create({
    data: input,
  });

export const updateContact: ServiceResolver<MutationResolvers["updateContact"]> = ({ id, input }) =>
  db.contact.update({
    data: input as Prisma.ContactUpdateInput,
    where: { id },
  });

export const deleteContact: ServiceResolver<MutationResolvers["deleteContact"]> = ({ id }) =>
  db.contact.delete({
    where: { id },
  });
