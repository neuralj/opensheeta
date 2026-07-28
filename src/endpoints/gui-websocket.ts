import { WebSocketServer, WebSocket } from "ws"
import type { Logger } from "@/shared/logger"
import type { OWClientMessage } from "@/types/openworker"

export interface GUIWebSocketHandlers {
  onConnect(ws: WebSocket, sessionId: string): void
  onMessage(ws: WebSocket, sessionId: string, message: OWClientMessage): void
  onDisconnect(sessionId: string): void
}

export interface GUIWebSocketOptions {
  port: number
  host: string
  token: string
  logger: Logger
  handlers: GUIWebSocketHandlers
}

export class GUIWebSocketEndpoint {
  private wss: WebSocketServer | null = null
  private readonly opts: GUIWebSocketOptions
  private readonly log: Logger

  constructor(opts: GUIWebSocketOptions) {
    this.opts = opts
    this.log = opts.logger.child({ component: "gui-websocket" })
  }

  start(): void {
    this.wss = new WebSocketServer({
      port: this.opts.port,
      host: this.opts.host,
    })

    this.wss.on("connection", (ws, req) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`)
      const sessionId = url.searchParams.get("session_id") ?? "default"

      this.log.info("GUI client connected", { sessionId })
      this.opts.handlers.onConnect(ws, sessionId)

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as OWClientMessage
          this.opts.handlers.onMessage(ws, sessionId, msg)
        } catch (err) {
          this.log.warn("Invalid message from GUI", { error: String(err) })
          ws.send(JSON.stringify({ type: "input_rejected", data: { error: "Invalid JSON" } }))
        }
      })

      ws.on("close", () => {
        this.log.info("GUI client disconnected", { sessionId })
        this.opts.handlers.onDisconnect(sessionId)
      })
    })

    this.log.info("GUI WebSocket server started", { port: this.opts.port })
  }

  stop(): void {
    this.wss?.close()
    this.wss = null
  }
}
