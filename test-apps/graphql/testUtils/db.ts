import { hashPassword } from "@rwgql/dbauth/server";
import { db, type Contact, type Post, type User } from "db";

const testPassword = hashPassword("test-password");

export async function resetDatabase() {
  await db.contact.deleteMany();
  await db.post.deleteMany();
  await db.user.deleteMany();
}

export async function createUser(
  data: Pick<User, "email"> & Partial<Pick<User, "fullName" | "roles">>,
) {
  return db.user.create({
    data: {
      email: data.email,
      fullName: data.fullName ?? "String",
      hashedPassword: testPassword.hashedPassword,
      roles: data.roles ?? null,
      salt: testPassword.salt,
    },
  });
}

export async function seedPostsFixture() {
  const authorOne = await createUser({ email: "String13" });
  const authorTwo = await createUser({ email: "String27" });

  const postOne = await db.post.create({
    data: { authorId: authorOne.id, body: "String", title: "String" },
  });
  const postTwo = await db.post.create({
    data: { authorId: authorTwo.id, body: "String", title: "String" },
  });

  return {
    post: {
      one: postOne,
      two: postTwo,
    },
  } satisfies { post: Record<"one" | "two", Post> };
}

export async function seedUsersFixture() {
  const userOne = await createUser({ email: "String9" });
  await createUser({ email: "String17" });

  return {
    user: {
      one: userOne,
    },
  } satisfies { user: Record<"one", User> };
}

export async function seedContactsFixture() {
  const contactOne = await db.contact.create({
    data: { email: "String", message: "String", name: "String" },
  });
  const contactTwo = await db.contact.create({
    data: { email: "String", message: "String", name: "String" },
  });

  return {
    contact: {
      one: contactOne,
      two: contactTwo,
    },
  } satisfies { contact: Record<"one" | "two", Contact> };
}
