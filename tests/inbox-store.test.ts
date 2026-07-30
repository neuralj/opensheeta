import { describe, it, expect, beforeEach } from "vitest"
import { createInboxStore, type InboxStoreAdapter } from "../src/adapters/inbox-store"
import { createLogger } from "../src/shared/logger"
import { unlinkSync, existsSync } from "fs"

const TEST_DB = "/tmp/test-inbox.db"

describe("InboxStore", () => {
  let store: InboxStoreAdapter

  beforeEach(async () => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
    store = await createInboxStore(TEST_DB, createLogger("error"))
  })

  it("adds and retrieves an item", async () => {
    const item = await store.addItem({
      session_id: "s1",
      kind: "approval",
      title: "Run bash?",
      body: "ls -la",
      visibility: "inline",
    })
    expect(item.id).toBeTruthy()
    expect(item.state).toBe("pending")

    const retrieved = await store.getItem(item.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.title).toBe("Run bash?")
  })

  it("lists pending items", async () => {
    await store.addItem({ session_id: "s1", kind: "approval", title: "A", body: "", visibility: "inline" })
    await store.addItem({ session_id: "s1", kind: "question", title: "B", body: "", visibility: "inbox" })
    const pending = await store.listPending()
    expect(pending).toHaveLength(2)
  })

  it("filters pending by session", async () => {
    await store.addItem({ session_id: "s1", kind: "approval", title: "A", body: "", visibility: "inline" })
    await store.addItem({ session_id: "s2", kind: "approval", title: "B", body: "", visibility: "inline" })
    const pending = await store.listPending("s1")
    expect(pending).toHaveLength(1)
    expect(pending[0].title).toBe("A")
  })

  it("returns null for non-existent item", async () => {
    const item = await store.getItem("nonexistent")
    expect(item).toBeNull()
  })

  it("addItem returns item with correct fields", async () => {
    const item = await store.addItem({
      session_id: "s1",
      kind: "notification",
      title: "Test notification",
      body: "Some body text",
      visibility: "inbox",
      data: { key: "value" },
    })
    expect(item.session_id).toBe("s1")
    expect(item.kind).toBe("notification")
    expect(item.title).toBe("Test notification")
    expect(item.body).toBe("Some body text")
    expect(item.visibility).toBe("inbox")
    expect(item.state).toBe("pending")
    expect(item.resolution).toBeNull()
    expect(item.data).toEqual({ key: "value" })
  })
})
