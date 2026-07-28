import { spawn, type ChildProcess } from "child_process"
import type { DaemonConfig } from "@/config"
import type { Logger } from "@/shared/logger"
import { OpenCodeProcessError } from "@/shared/errors"

export interface OpenCodeProcessOptions {
  config: DaemonConfig
  logger: Logger
  onExit?: (code: number | null) => void
}

export class OpenCodeProcess {
  private proc: ChildProcess | null = null
  private ready = false
  private readonly config: DaemonConfig
  private readonly logger: Logger
  private readonly onExit?: (code: number | null) => void

  constructor(opts: OpenCodeProcessOptions) {
    this.config = opts.config
    this.logger = opts.logger.child({ component: "opencode-process" })
    this.onExit = opts.onExit
  }

  async start(): Promise<void> {
    if (this.proc) throw new OpenCodeProcessError("Already running")

    const port = this.config.opencode.port
    const host = this.config.opencode.host

    this.logger.info("Starting OpenCode server", { port, host })

    this.proc = spawn("opencode", ["serve", "--port", String(port), "--hostname", host], {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        OPENCODE_SERVER_PASSWORD: this.generateToken(),
      },
    })

    this.proc.stdout?.on("data", (data: Buffer) => {
      this.logger.debug("opencode stdout", { line: data.toString().trim() })
    })

    this.proc.stderr?.on("data", (data: Buffer) => {
      this.logger.debug("opencode stderr", { line: data.toString().trim() })
    })

    this.proc.on("exit", (code) => {
      this.logger.warn("OpenCode process exited", { code })
      this.proc = null
      this.ready = false
      this.onExit?.(code)
    })

    this.proc.on("error", (err) => {
      this.logger.error("OpenCode process error", { error: err.message })
    })

    await this.waitForReady()
  }

  private async waitForReady(timeoutMs = 15_000): Promise<void> {
    const start = Date.now()
    const url = `http://${this.config.opencode.host}:${this.config.opencode.port}/global/health`

    while (Date.now() - start < timeoutMs) {
      try {
        const resp = await fetch(url)
        if (resp.ok) {
          this.ready = true
          this.logger.info("OpenCode server is ready")
          return
        }
      } catch {
        // not ready yet
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    throw new OpenCodeProcessError("OpenCode server failed to start within timeout")
  }

  async stop(): Promise<void> {
    if (!this.proc) return
    this.logger.info("Stopping OpenCode server")
    this.proc.kill("SIGTERM")
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.proc?.kill("SIGKILL")
        resolve()
      }, 5000)
      this.proc?.on("exit", () => {
        clearTimeout(timer)
        resolve()
      })
    })
    this.proc = null
    this.ready = false
  }

  isReady(): boolean {
    return this.ready
  }

  private generateToken(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let token = ""
    for (let i = 0; i < 64; i++) token += chars[Math.floor(Math.random() * chars.length)]
    return token
  }
}
