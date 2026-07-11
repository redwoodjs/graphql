import { hashPassword } from "@rwgql/dbauth/server";
import { db } from "db";

const demoPassword = "password";

if (process.env.FORCE_DEMO_SEED === "1") {
  await db.$executeRawUnsafe(`TRUNCATE "Contact", "Post", "User" RESTART IDENTITY CASCADE`);
  console.info("Cleared demo tables (FORCE_DEMO_SEED)");
}

const seedUsers = async () => {
  const adaPassword = hashPassword(demoPassword);
  const gracePassword = hashPassword(demoPassword);

  const users = [
    {
      email: "ada@example.com",
      fullName: "Ada Lovelace",
      hashedPassword: adaPassword.hashedPassword,
      id: 1,
      roles: "ADMIN",
      salt: adaPassword.salt,
    },
    {
      email: "grace@example.com",
      fullName: "Grace Hopper",
      hashedPassword: gracePassword.hashedPassword,
      id: 2,
      roles: "USER",
      salt: gracePassword.salt,
    },
  ] as const;

  if ((await db.user.count()) === 0) {
    await Promise.all(users.map((user) => db.user.create({ data: user })));
    console.info("Seeded users");
  } else {
    console.info("Users already seeded");
  }
};

const seedPosts = async () => {
  const posts = [
    {
      authorId: 1,
      body: "This post is served by the standalone Fastify GraphQL endpoint backed by PostgreSQL.",
      title: "Migrating Redwood Cells",
    },
    {
      authorId: 2,
      body: "The page, layout, component, and Cell structure mirrors a classic Cedar web app with a real DB.",
      title: "RWSdk Route Parity",
    },
    {
      authorId: 1,
      body: "Meh waistcoat succulents umami asymmetrical, hoodie post-ironic paleo chillwave tote bag.",
      title: "What is the meaning of life?",
    },
  ] as const;

  if ((await db.post.count()) === 0) {
    await Promise.all(posts.map((post) => db.post.create({ data: post })));
    console.info("Seeded posts");
  } else {
    console.info("Posts already seeded");
  }
};

const seedContacts = async () => {
  const contacts = [
    {
      email: "hello@example.com",
      message: "Can we run this app on RWSdk with PostgreSQL?",
      name: "Test Contact",
    },
    {
      email: "support@example.com",
      message: "This record is persisted in PostgreSQL via Prisma.",
      name: "Second Contact",
    },
  ] as const;

  if ((await db.contact.count()) === 0) {
    await Promise.all(contacts.map((contact) => db.contact.create({ data: contact })));
    console.info("Seeded contacts");
  } else {
    console.info("Contacts already seeded");
  }
};

try {
  await seedUsers();
  await seedPosts();
  await seedContacts();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
