import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatKzt, formatNumber, formatShortDate, formatTime } from "@/lib/domain/money";
import { formatKzPhone, normalizeKzPhone } from "@/lib/domain/phone";
import { isOpenAt } from "@/lib/domain/hours";
import { splitLocalized } from "@/lib/order-view";
import { localizedPath, alternatesFor } from "@/lib/site";
import { pick } from "@/i18n/config";

describe("formatKzt", () => {
  it("formats whole tenge with grouping and the ₸ sign", () => {
    expect(formatKzt(2490, "ru")).toBe("2 490 ₸");
    expect(formatKzt(2490, "en")).toBe("2,490 ₸");
    expect(formatKzt(0, "kk")).toBe("0 ₸");
    expect(formatKzt(1234567, "kk")).toBe("1 234 567 ₸");
  });
});

describe("deterministic dates (identical on server and client)", () => {
  const d = new Date("2026-11-04T19:05:00Z"); // 00:05 on 5 Nov in Almaty (UTC+5)
  it("formats in the restaurant timezone", () => {
    expect(formatTime(d)).toBe("00:05");
    expect(formatDate(d, "kk")).toBe("2026 ж. 5 қар.");
    expect(formatDate(d, "ru")).toBe("5 нояб. 2026 г.");
    expect(formatDate(d, "en")).toBe("Nov 5, 2026");
    expect(formatDateTime(d, "en")).toBe("Nov 5, 2026, 00:05");
  });
  it("formats compact chart labels and numbers", () => {
    expect(formatShortDate(d, "ru")).toBe("5 нояб.");
    expect(formatShortDate(d, "en", true)).toBe("Nov 26");
    expect(formatNumber(12.5, "ru")).toBe("12,5");
    expect(formatNumber(12.5, "en")).toBe("12.5");
    expect(formatKzt(-1500, "kk")).toBe("-1 500 ₸");
  });
});

describe("Kazakhstan phone numbers", () => {
  it("normalizes common formats to E.164", () => {
    for (const input of ["+7 701 234 56 78", "87012345678", "7012345678", "+7(701)234-56-78", "77012345678"]) {
      expect(normalizeKzPhone(input)).toBe("+77012345678");
    }
  });
  it("rejects non-mobile and malformed numbers", () => {
    for (const input of ["+7 727 123 45 67", "12345", "+1 555 123 4567", "", "+7 701 234 56 7"]) {
      expect(normalizeKzPhone(input)).toBeNull();
    }
  });
  it("formats for display", () => {
    expect(formatKzPhone("+77012345678")).toBe("+7 701 234 56 78");
  });
});

describe("opening hours", () => {
  const hours = Array.from({ length: 7 }, (_, day) => ({ day, open: "10:00", close: day === 4 ? "02:00" : "23:00", closed: day === 6 }));
  // 2026-11-04 is a Wednesday. Almaty = UTC+5.
  it("is open during the day and closed at night", () => {
    expect(isOpenAt(hours, new Date("2026-11-04T07:00:00Z"))).toBe(true); // 12:00
    expect(isOpenAt(hours, new Date("2026-11-04T19:30:00Z"))).toBe(false); // 00:30 Thu
  });
  it("handles closing after midnight", () => {
    // Friday 10:00–02:00 → Saturday 01:00 is open.
    expect(isOpenAt(hours, new Date("2026-11-06T20:00:00Z"))).toBe(true);
  });
  it("respects closed days", () => {
    expect(isOpenAt(hours, new Date("2026-11-08T07:00:00Z"))).toBe(false); // Sunday
  });
});

describe("localization helpers", () => {
  it("splits localized snapshots", () => {
    expect(splitLocalized("30 см / 30 см / 30 cm", "en")).toBe("30 cm");
    expect(splitLocalized("plain", "ru")).toBe("plain");
    expect(splitLocalized(null, "kk")).toBe("");
  });
  it("picks localized columns", () => {
    const row = { nameKk: "Бургер", nameRu: "Бургер RU", nameEn: "Burger" };
    expect(pick(row, "name", "en")).toBe("Burger");
    expect(pick(row, "name", "ru")).toBe("Бургер RU");
  });
  it("builds locale-prefixed paths (Kazakh has no prefix)", () => {
    expect(localizedPath("/menu", "kk")).toBe("/menu");
    expect(localizedPath("/menu", "ru")).toBe("/ru/menu");
    expect(localizedPath("/", "en")).toBe("/en");
    expect(alternatesFor("/menu", "ru").canonical).toBe("/ru/menu");
  });
});
