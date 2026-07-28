export interface ConnectorToolSchema {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, unknown>
      required: string[]
    }
  }
}

export interface ConnectorToolMetadata {
  name: string
  category: string
  risk_level: "low" | "medium" | "high"
  capabilities: string[]
  requires_approval: boolean
}

export interface ConnectorTool {
  name: string
  schema: ConnectorToolSchema
  metadata: ConnectorToolMetadata
  execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
}

export interface ConnectorDescriptor {
  name: string
  title: string
  fields: ConnectorField[]
  validate: (creds: Record<string, string>) => Promise<{ ok: boolean; identity?: string; error?: string }>
}

export interface ConnectorField {
  key: string
  label: string
  secret: boolean
  required: boolean
  help?: string
  placeholder?: string
}

export interface ConnectorProfile {
  type: "token" | "oauth" | "none"
  enabled: boolean
  managed: boolean
  account?: string
  [key: string]: unknown
}
