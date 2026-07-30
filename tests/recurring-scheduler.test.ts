import { describe, it, expect } from "vitest"
import { parseCron, nextRun } from "../src/scheduler/recurring-scheduler"

describe("parseCron", () => {
  it("parses wildcard expression", () => {
    const parsed = parseCron("* * * * *")
    expect(parsed).not.toBeNull()
    expect(parsed).toHaveLength(5)
    for (const field of parsed!) {
      expect(field.set).toBeNull()
    }
  })

  it("parses specific values", () => {
    const parsed = parseCron("30 2 15 6 3")
    expect(parsed).not.toBeNull()
    expect(parsed![0].set).toEqual(new Set([30]))
    expect(parsed![1].set).toEqual(new Set([2]))
    expect(parsed![2].set).toEqual(new Set([15]))
    expect(parsed![3].set).toEqual(new Set([6]))
    expect(parsed![4].set).toEqual(new Set([3]))
  })

  it("parses comma-separated values", () => {
    const parsed = parseCron("0,15,30,45 * * * *")
    expect(parsed).not.toBeNull()
    expect(parsed![0].set).toEqual(new Set([0, 15, 30, 45]))
  })

  it("parses range expressions", () => {
    const parsed = parseCron("0 9-17 * * 1-5")
    expect(parsed).not.toBeNull()
    expect(parsed![1].set).toEqual(new Set([9, 10, 11, 12, 13, 14, 15, 16, 17]))
    expect(parsed![4].set).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  it("parses step expressions", () => {
    const parsed = parseCron("*/15 * * * *")
    expect(parsed).not.toBeNull()
    expect(parsed![0].set).toEqual(new Set([0, 15, 30, 45]))
  })

  it("parses range with step", () => {
    const parsed = parseCron("0 9-17/2 * * *")
    expect(parsed).not.toBeNull()
    expect(parsed![1].set).toEqual(new Set([9, 11, 13, 15, 17]))
  })

  it("handles aliases", () => {
    const parsed = parseCron("@daily")
    expect(parsed).not.toBeNull()
    expect(parsed![0].set).toEqual(new Set([0]))
    expect(parsed![1].set).toEqual(new Set([0]))
  })

  it("returns null for invalid expression", () => {
    expect(parseCron("invalid")).toBeNull()
    expect(parseCron("* * *")).toBeNull()
  })
})

describe("nextRun", () => {
  it("finds next minute for wildcard", () => {
    const parsed = parseCron("* * * * *")!
    const from = new Date("2024-01-15T10:30:00Z")
    const next = nextRun(parsed, from)
    expect(next.getTime()).toBe(new Date("2024-01-15T10:31:00Z").getTime())
  })

  it("finds next specific time", () => {
    const parsed = parseCron("0 12 * * *")!
    const from = new Date("2024-01-15T10:30:00Z")
    const next = nextRun(parsed, from)
    expect(next.getHours()).toBe(12)
    expect(next.getMinutes()).toBe(0)
  })

  it("rolls to next day if time passed", () => {
    const parsed = parseCron("0 9 * * *")!
    const from = new Date("2024-01-15T10:00:00Z")
    const next = nextRun(parsed, from)
    expect(next.getDate()).toBe(16)
    expect(next.getHours()).toBe(9)
  })
})
