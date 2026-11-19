import { describe, expect, it } from "vitest";
import { isDemoEmail, maskAddress, maskEmail, maskName, maskPhone } from "@/lib/demo";

describe("demo accounts", () => {
  it("recognises demo addresses only", () => {
    expect(isDemoEmail("admin@foodhub.example.com")).toBe(true);
    expect(isDemoEmail(" Kitchen@FoodHub.Example.com ")).toBe(true);
    expect(isDemoEmail("admin@gmail.com")).toBe(false);
    expect(isDemoEmail("admin@foodhub.example.com.evil.kz")).toBe(false);
    expect(isDemoEmail(undefined)).toBe(false);
  });

  it("masks personal data for demo viewers", () => {
    expect(maskEmail("aigerim.n@mail.kz")).toBe("ai•••@m•••.kz");
    expect(maskPhone("+77015554433")).toBe("+7 701 ••• •• 33");
    expect(maskPhone("garbage")).toBe("•••");
    expect(maskAddress("Abai ave 10, apt 5")).toBe("Abai •••");
    expect(maskEmail(null)).toBe("");
    expect(maskName("Aigerim Nurlanova")).toBe("Aigerim N.");
    expect(maskName("Aigerim")).toBe("Aigerim");
    expect(maskName("Demo Customer")).toBe("Demo Customer");
  });
});
