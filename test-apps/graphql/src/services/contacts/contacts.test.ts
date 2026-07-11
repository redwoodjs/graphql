import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Contact } from "db";
import { callService } from "@rwgql/graphql-typegen/yoga";

import { resetDatabase, seedContactsFixture } from "../../../testUtils/db.ts";
import { contact, contacts, createContact, deleteContact, updateContact } from "./contacts.ts";

describe("contacts", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns all contacts", async () => {
    const fixture = await seedContactsFixture();
    const result = await callService(contacts, {});

    expect(result.length).toEqual(Object.keys(fixture.contact).length);
  });

  it("returns a single contact", async () => {
    const fixture = await seedContactsFixture();
    const result = await callService(contact, { id: fixture.contact.one.id });

    expect(result).toEqual(fixture.contact.one);
  });

  it("creates a contact", async () => {
    const result = await callService(createContact, {
      input: { email: "String", message: "String", name: "String" },
    });

    expect(result).toBeDefined();
    expect(result!.name).toEqual("String");
    expect(result!.email).toEqual("String");
    expect(result!.message).toEqual("String");
  });

  it("updates a contact", async () => {
    const fixture = await seedContactsFixture();
    const original = (await callService(contact, { id: fixture.contact.one.id })) as Contact;
    const result = await callService(updateContact, {
      id: original.id,
      input: { name: "String2" },
    });

    expect(result.name).toEqual("String2");
  });

  it("deletes a contact", async () => {
    const fixture = await seedContactsFixture();
    const original = (await callService(deleteContact, { id: fixture.contact.one.id })) as Contact;
    const result = await callService(contact, { id: original.id });

    expect(result).toEqual(null);
  });
});
