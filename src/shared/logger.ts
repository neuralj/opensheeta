export type LogLevel = "debug" | "info" | "warn" | "error"

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void
  info(msg: string, data?: Record<string, unknown>): void
  warn(msg: string, data?: Record<string, unknown>): void
  error(msg: string, data?: Record<string, unknown>): void
  child(context: Record<string, string>): Logger
}

export function createLogger(level: LogLevel = "info"): Logger {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"]
  const minLevel = levels.indexOf(level)

  function log(lvl: LogLevel, msg: string, data?: Record<string, unknown>, ctx?: Record<string, string>) {
    if (levels.indexOf(lvl) < minLevel) return
    const entry = {
      ts: new Date().toISOString(),
      level: lvl,
      msg,
      ...ctx,
      ...data,
    }
    const output = JSON.stringify(entry)
    if (lvl === "error") process.stderr.write(output + "\n")
    else process.stdout.write(output + "\n")
  }

  return {
    debug: (msg, data?) => log("debug", msg, data),
    info: (msg, data?) => log("info", msg, data),
    warn: (msg, data?) => log("warn", msg, data),
    error: (msg, data?) => log("error", msg, data),
    child: (context) => {
      return {
        debug: (msg, data?) => log("debug", msg, data, context),
        info: (msg, data?) => log("info", msg, data, context),
        warn: (msg, data?) => log("warn", msg, data, context),
        error: (msg, data?) => log("error", msg, data, context),
        child: (more) => createLogger(level).child({ ...context, ...more }),
      }
    },
  }
}
