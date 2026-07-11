import { db } from "db";
import type { Prisma } from "db";

import type { MutationResolvers, PostRelationResolvers, QueryResolvers } from "types/graphql";
import type { ServiceResolver } from "@rwgql/graphql-typegen";

import { userPublicSelect } from "../users/userPublicSelect.ts";

export const posts: ServiceResolver<QueryResolvers["posts"]> = () => db.post.findMany();

export const post: ServiceResolver<QueryResolvers["post"]> = ({ id }) =>
  db.post.findUnique({
    where: { id },
  });

export const createPost: ServiceResolver<MutationResolvers["createPost"]> = ({ input }) =>
  db.post.create({
    data: input,
  });

export const updatePost: ServiceResolver<MutationResolvers["updatePost"]> = ({ id, input }) =>
  db.post.update({
    data: input as Prisma.PostUpdateInput,
    where: { id },
  });

export const deletePost: ServiceResolver<MutationResolvers["deletePost"]> = ({ id }) =>
  db.post.delete({
    where: { id },
  });

export const Post: PostRelationResolvers = {
  author: async (_args, { root }) => {
    if (!root.authorId) {
      throw new Error(`Post ${root.id} is missing author`);
    }

    const author = await db.user.findUnique({
      select: userPublicSelect,
      where: { id: root.authorId },
    });

    if (!author) {
      throw new Error(`Post ${root.id} is missing author`);
    }

    return author;
  },
};
