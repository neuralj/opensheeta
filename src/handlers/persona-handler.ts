import { readFileSync, readdirSync, existsSync } from "fs"
import { resolve, join } from "path"
import type { Logger } from "@/shared/logger"
import type { PersonaManifest } from "@/types/persona"
import type { AgentConfig } from "@/types/opencode"

export interface PersonaHandler {
  loadPersonas(dir: string): PersonaManifest[]
  toOpenCodeAgents(personas: PersonaManifest[]): Record<string, AgentConfig>
  getPersona(id: string): PersonaManifest | null
}

export function createPersonaHandler(logger: Logger): PersonaHandler {
  const log = logger.child({ component: "persona-handler" })
  const cache = new Map<string, PersonaManifest>()

  return {
    loadPersonas(dir) {
      const resolved = resolve(dir)
      if (!existsSync(resolved)) {
        log.warn("Persona directory not found", { dir: resolved })
        return []
      }

      const files = readdirSync(resolved).filter((f) => f.endsWith(".md"))
      const personas: PersonaManifest[] = []

      for (const file of files) {
        try {
          const content = readFileSync(join(resolved, file), "utf-8")
          const persona = parseManifest(content, file)
          personas.push(persona)
          cache.set(persona.id, persona)
        } catch (err) {
          log.error("Failed to parse persona", { file, error: String(err) })
        }
      }

      log.info("Personas loaded", { count: personas.length })
      return personas
    },

    toOpenCodeAgents(personas) {
      const agents: Record<string, AgentConfig> = {}

      for (const p of personas) {
        const permission: Record<string, unknown> = {}
        if (p.family === "code") {
          permission.edit = "ask"
          permission.bash = "ask"
        } else if (p.family === "knowledge") {
          permission.edit = "deny"
          permission.bash = "deny"
        }

        if (p.workspace === "none") {
          permission.edit = "deny"
          permission.bash = "deny"
        }

        const tools: Record<string, boolean> = {}
        if (p.connectors) {
          tools["mcp__openworker-connectors_*"] = true
        }

        agents[p.id] = {
          description: p.name,
          mode: "primary",
          prompt: p.system_prompt,
          permission,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
        }
      }

      return agents
    },

    getPersona(id) {
      return cache.get(id) ?? null
    },
  }
}

function parseManifest(content: string, filename: string): PersonaManifest {
  const fmEnd = content.indexOf("\n---", 3)
  if (fmEnd === -1) throw new Error("Missing frontmatter closing ---")

  const frontmatter = content.slice(3, fmEnd).trim()
  const body = content.slice(fmEnd + 4).trim()

  const meta: Record<string, unknown> = {}
  for (const line of frontmatter.split("\n")) {
    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "")
    if (key) meta[key] = val
  }

  return {
    id: (meta.id as string) ?? filename.replace(".md", ""),
    name: (meta.name as string) ?? filename.replace(".md", ""),
    system_prompt: body,
    family: ((meta.family as string) ?? "knowledge") as PersonaManifest["family"],
    workspace: ((meta.workspace as string) ?? "deliverable") as PersonaManifest["workspace"],
    messaging: meta.messaging === "true",
    connectors: meta.connectors === "true",
    default_permission_mode: ((meta.default_permission_mode as string) ?? "interactive") as PersonaManifest["default_permission_mode"],
  }
}
