import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { Logger } from "@/shared/logger"
import type { OpenCodeSSEEvent } from "@/types/opencode"

export interface OpenCodeSSEHandlers {
  onEvent(event: OpenCodeSSEEvent): void
}

export class OpenCodeSSEEndpoint {
  private running = false
  private readonly api: OpenCodeAPIClient
  private readonly logger: Logger
  private readonly handlers: OpenCodeSSEHandlers

  constructor(api: OpenCodeAPIClient, logger: Logger, handlers: OpenCodeSSEHandlers) {
    this.api = api
    this.logger = logger.child({ component: "opencode-sse" })
    this.handlers = handlers
  }

  async start(): Promise<void> {
    this.running = true
    this.logger.info("SSE endpoint started")

    while (this.running) {
      try {
        for await (const event of this.api.subscribeEvents()) {
          if (!this.running) break
          this.handlers.onEvent(event)
        }
      } catch (err) {
        this.logger.warn("SSE stream error, reconnecting", { error: String(err) })
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  }

  stop(): void {
    this.running = false
  }
}
