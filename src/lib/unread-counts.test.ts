import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { clients, monitoredPages, pageChanges } from "@/db/schema";
import { getUnreadCounts } from "./unread-counts";

// Skips the GitHub SHA comparison, which would hit the network.
process.env.RUNNING_IN_DOCKER = "1";

function clientWithChanges(name: string, changes: number): number {
  const client = db
    .insert(clients)
    .values({ name, url: `https://${name}.example.test` })
    .returning({ id: clients.id })
    .get();
  const page = db
    .insert(monitoredPages)
    .values({ clientId: client.id, url: `https://${name}.example.test/` })
    .returning({ id: monitoredPages.id })
    .get();
  for (let i = 0; i < changes; i++) {
    db.insert(pageChanges)
      .values({ monitoredPageId: page.id, field: "title" })
      .run();
  }
  return client.id;
}

describe("getUnreadCounts page-change badge", () => {
  const mine = clientWithChanges("mine", 2);
  clientWithChanges("theirs", 3);

  it("counts every client's changes when the caller sees all clients", async () => {
    expect((await getUnreadCounts(null)).pageChanges).toBe(5);
  });

  it("counts only the clients a member is assigned to", async () => {
    expect((await getUnreadCounts([mine])).pageChanges).toBe(2);
  });

  it("counts nothing for a caller who sees no client", async () => {
    expect((await getUnreadCounts([])).pageChanges).toBe(0);
  });
});
