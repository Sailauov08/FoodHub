import { describe, expect, it, vi } from "vitest";
import { describeError, isRetryableOperation, isTransientConnectionError, withRetry } from "@/lib/db-retry";

const errorEvent = { type: "error", defaultPrevented: false, cancelable: false, timeStamp: 1 };

describe("transient database errors", () => {
  it("recognises Neon WebSocket ErrorEvents and network failures", () => {
    expect(isTransientConnectionError(errorEvent)).toBe(true);
    expect(isTransientConnectionError(Object.assign(new Error("x"), { code: "P1001" }))).toBe(true);
    expect(isTransientConnectionError(new Error("read ECONNRESET"))).toBe(true);
    expect(isTransientConnectionError(new Error("wrapped", { cause: errorEvent }))).toBe(true);
  });

  it("does not treat business or validation errors as transient", () => {
    expect(isTransientConnectionError(new Error("Unique constraint failed"))).toBe(false);
    expect(isTransientConnectionError(Object.assign(new Error("x"), { code: "P2002" }))).toBe(false);
    expect(isTransientConnectionError(null)).toBe(false);
  });

  it("only retries reads", () => {
    expect(isRetryableOperation("findMany")).toBe(true);
    expect(isRetryableOperation("count")).toBe(true);
    expect(isRetryableOperation("create")).toBe(false);
    expect(isRetryableOperation("updateMany")).toBe(false);
    expect(isRetryableOperation("$executeRaw")).toBe(false);
  });

  it("describes ErrorEvents readably for logs", () => {
    expect(describeError(errorEvent)).toBe("WebSocket ErrorEvent");
    expect(describeError(new Error("boom"))).toBe("boom");
  });
});

describe("withRetry", () => {
  it("retries transient failures and then succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce(errorEvent).mockRejectedValueOnce(errorEvent).mockResolvedValue(42);
    await expect(withRetry(fn, 3, 1)).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("gives up after the last attempt", async () => {
    const fn = vi.fn().mockRejectedValue(errorEvent);
    await expect(withRetry(fn, 3, 1)).rejects.toBe(errorEvent);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-transient errors", async () => {
    const err = new Error("Unique constraint failed");
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, 3, 1)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
