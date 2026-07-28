export interface PersonaManifest {
  id: string
  name: string
  system_prompt: string
  icon?: string
  tagline?: string
  description?: string
  tools?: string[]
  family: "code" | "knowledge"
  workspace: "git" | "project" | "deliverable" | "none"
  messaging: boolean
  connectors: boolean
  default_permission_mode: "discuss" | "plan" | "interactive" | "custom" | "auto"
  recommended_models?: string[]
  skills?: string[]
  mcp?: string[]
  recommends?: PersonaRecommendation[]
}

export interface PersonaRecommendation {
  kind: "connector" | "mcp"
  ref: string
  reason?: string
  tier: "core" | "optional"
}
