import { db } from "db";

import type { QueryResolvers, UserRelationResolvers } from "types/graphql";
import type { ServiceResolver } from "@rwgql/graphql-typegen";

import { userPublicSelect } from "./userPublicSelect.ts";

export const user: ServiceResolver<QueryResolvers["user"]> = ({ id }) =>
  db.user.findUnique({
    select: userPublicSelect,
    where: { id },
  });

export const User: UserRelationResolvers = {
  posts: async (_args, { root }) => {
    const posts = await db.user.findUnique({ where: { id: root.id } }).posts();
    return posts ?? [];
  },
};
