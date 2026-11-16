import { describe, expect, it } from "vitest";
import { ensureCustomerForUser, parseOwnerEmails, splitName } from "@/lib/customer-link";

type Row = { id: string; userId: string | null; email: string | null; firstName: string; lastName: string };

/** Minimal in-memory stand-in for the two Prisma delegates the linker uses. */
function fakeDb(rows: Row[]) {
  let n = rows.length;
  const customer = {
    findUnique: async ({ where }: { where: { userId?: string; email?: string } }) =>
      rows.find((r) => (where.userId !== undefined ? r.userId === where.userId : r.email === where.email)) ?? null,
    updateMany: async ({ where, data }: { where: { id: string; userId: null }; data: { userId: string } }) => {
      const row = rows.find((r) => r.id === where.id && r.userId === null);
      if (!row) return { count: 0 };
      row.userId = data.userId;
      return { count: 1 };
    },
    create: async ({ data }: { data: Omit<Row, "id"> }) => {
      const row = { id: `c${++n}`, ...data };
      rows.push(row);
      return row;
    },
  };
  return { rows, db: { customer, user: {} } as never };
}

const user = { id: "u1", name: "Sam Skater", email: "Sam@Example.com", emailVerified: true };

describe("ensureCustomerForUser", () => {
  it("links an owner-created customer with the same email", async () => {
    const { rows, db } = fakeDb([{ id: "c1", userId: null, email: "sam@example.com", firstName: "Sam", lastName: "S" }]);
    const c = await ensureCustomerForUser(db, user);
    expect(c.id).toBe("c1");
    expect(rows[0].userId).toBe("u1");
    expect(rows).toHaveLength(1);
  });

  it("returns the already-linked customer", async () => {
    const { rows, db } = fakeDb([{ id: "c1", userId: "u1", email: "other@example.com", firstName: "Sam", lastName: "" }]);
    const c = await ensureCustomerForUser(db, user);
    expect(c.id).toBe("c1");
    expect(rows).toHaveLength(1);
  });

  it("creates a new customer when none matches", async () => {
    const { rows, db } = fakeDb([]);
    const c = await ensureCustomerForUser(db, user);
    expect(rows).toHaveLength(1);
    expect(c).toMatchObject({ userId: "u1", email: "sam@example.com", firstName: "Sam", lastName: "Skater" });
  });

  it("does not take over a customer already linked to someone else", async () => {
    const { rows, db } = fakeDb([{ id: "c1", userId: "someone-else", email: "sam@example.com", firstName: "X", lastName: "" }]);
    const c = await ensureCustomerForUser(db, user);
    expect(c.id).not.toBe("c1");
    expect(rows[0].userId).toBe("someone-else");
    expect(c.email).toBeNull();
  });

  it("refuses to link when the email isn't verified", async () => {
    const { db } = fakeDb([{ id: "c1", userId: null, email: "sam@example.com", firstName: "Sam", lastName: "" }]);
    await expect(ensureCustomerForUser(db, { ...user, emailVerified: false })).rejects.toThrow();
  });
});

describe("helpers", () => {
  it("splits names", () => {
    expect(splitName("Jamie Lee Curtis")).toEqual({ firstName: "Jamie", lastName: "Lee Curtis" });
    expect(splitName("  ")).toEqual({ firstName: "", lastName: "" });
  });
  it("parses OWNER_EMAILS", () => {
    expect(parseOwnerEmails(" A@x.com, b@y.com ;c@z.com")).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
    expect(parseOwnerEmails(undefined)).toEqual([]);
  });
});
