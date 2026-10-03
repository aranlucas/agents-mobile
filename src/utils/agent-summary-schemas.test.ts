import { describe, expect, it } from "vitest";
import {
  grocerySummarySchema,
  tripSummarySchema,
  fitnessSummarySchema,
  wellnessSummarySchema,
} from "./agent-summary-schemas";

describe("agent summary boundaries", () => {
  it("omits malformed streaming fields without hiding valid summary text", () => {
    const state = tripSummarySchema.parse({
      destination: "Kyoto",
      travelers: "two",
      status: "unexpected",
    });

    expect(state.destination).toBe("Kyoto");
    expect(state.travelers).toBeUndefined();
    expect(state.status).toBeUndefined();
  });

  it("checks grocery arrays, native activities, and optional status contracts", () => {
    expect(
      grocerySummarySchema.parse({ shopping_list: "milk", meal_plan: "Dinner" }).shopping_list,
    ).toBeUndefined();
    expect(fitnessSummarySchema.parse({ activities: [{ id: "1" }] }).activities).toBeUndefined();
    expect(wellnessSummarySchema.parse({ weekly_plan: "Run", status: "ready" }).weekly_plan).toBe(
      "Run",
    );
    expect(grocerySummarySchema.safeParse(null).success).toBe(false);
  });
});
