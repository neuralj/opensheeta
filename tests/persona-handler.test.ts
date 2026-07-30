import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createPersonaHandler } from "../src/handlers/persona-handler"
import { createLogger } from "../src/shared/logger"
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs"
import { join } from "path"

const TEST_DIR = "/tmp/test-personas"

describe("PersonaHandler", () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true })
    writeFileSync(join(TEST_DIR, "cowork.md"), `---
id: cowork
name: Coworker
family: knowledge
workspace: deliverable
default_permission_mode: interactive
connectors: true
---
You are a helpful coworker.`)

    writeFileSync(join(TEST_DIR, "coder.md"), `---
id: coder
name: Coder
family: code
workspace: git
default_permission_mode: auto
---
You are a coding assistant.`)
  })

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it("loads personas from directory", () => {
    const handler = createPersonaHandler(createLogger("error"))
    const personas = handler.loadPersonas(TEST_DIR)
    expect(personas).toHaveLength(2)
  })

  it("parses persona fields correctly", () => {
    const handler = createPersonaHandler(createLogger("error"))
    const personas = handler.loadPersonas(TEST_DIR)
    const cowork = personas.find((p) => p.id === "cowork")
    expect(cowork).toBeTruthy()
    expect(cowork!.name).toBe("Coworker")
    expect(cowork!.family).toBe("knowledge")
    expect(cowork!.workspace).toBe("deliverable")
    expect(cowork!.default_permission_mode).toBe("interactive")
    expect(cowork!.connectors).toBe(true)
    expect(cowork!.system_prompt).toContain("helpful coworker")
  })

  it("converts personas to OpenCode agents", () => {
    const handler = createPersonaHandler(createLogger("error"))
    const personas = handler.loadPersonas(TEST_DIR)
    const agents = handler.toOpenCodeAgents(personas)

    expect(agents.cowork).toBeTruthy()
    expect(agents.cowork.prompt).toContain("helpful coworker")
    expect(agents.cowork.permission?.edit).toBe("deny")
    expect(agents.cowork.permission?.bash).toBe("deny")

    expect(agents.coder).toBeTruthy()
    expect(agents.coder.permission?.edit).toBe("ask")
    expect(agents.coder.permission?.bash).toBe("ask")
  })

  it("returns empty array for non-existent directory", () => {
    const handler = createPersonaHandler(createLogger("error"))
    const personas = handler.loadPersonas("/nonexistent/path")
    expect(personas).toHaveLength(0)
  })

  it("caches personas by id", () => {
    const handler = createPersonaHandler(createLogger("error"))
    handler.loadPersonas(TEST_DIR)
    const cached = handler.getPersona("cowork")
    expect(cached).toBeTruthy()
    expect(cached!.name).toBe("Coworker")
  })
})
