import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { Logger } from "@/shared/logger"

export interface HealthProbeHandler {
  onHealthy(): void
  onUnhealthy(error: string): void
}

export class HealthProbeScheduler {
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly api: OpenCodeAPIClient
  private readonly intervalMs: number
  private readonly logger: Logger
  private readonly handler: HealthProbeHandler

  constructor(
    api: OpenCodeAPIClient,
    intervalMs: number,
    logger: Logger,
    handler: HealthProbeHandler,
  ) {
    this.api = api
    this.intervalMs = intervalMs
    this.logger = logger.child({ component: "health-probe" })
    this.handler = handler
  }

  start(): void {
    this.logger.info("Health probe started", { intervalMs: this.intervalMs })
    this.timer = setInterval(() => this.probe(), this.intervalMs)
    this.probe()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async probe(): Promise<void> {
    try {
      const result = await this.api.health()
      if (result.healthy) {
        this.handler.onHealthy()
      } else {
        this.handler.onUnhealthy("Health check returned unhealthy")
      }
    } catch (err) {
      this.handler.onUnhealthy(String(err))
      this.logger.warn("Health probe failed", { error: String(err) })
    }
  }
}
