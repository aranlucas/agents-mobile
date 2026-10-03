import { z } from "zod";

const text = z.string().optional().catch(undefined);

const flag = z.boolean().optional().catch(undefined);

// These are display projections, not replacements for the SDK's mutable state.
// Invalid streaming fields are omitted while other valid summary fields remain.
export const tripSummarySchema = z.object({
  destination: text,
  headline: text,
  start_date: text,
  end_date: text,
  travelers: z.number().optional().catch(undefined),
  status: z.enum(["idle", "drafting", "ready_to_book", "booked"]).optional().catch(undefined),
});

export const grocerySummarySchema = z.object({
  shopping_list: z.array(z.string()).optional().catch(undefined),
  meal_plan: text,
  status: z.enum(["idle", "planning", "ready"]).optional().catch(undefined),
  kroger_connected: flag,
});

export const fitnessSummarySchema = z.object({
  fitness_data_connected: flag,
  activity_source: text,
  activities: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional()
    .catch(undefined),
  training_plan: text,
  status: z.enum(["idle", "syncing", "planning", "ready"]).optional().catch(undefined),
});

export const wellnessSummarySchema = z.object({
  weekly_plan: text,
  meal_plan: text,
  training_plan: text,
  status: z.enum(["idle", "delegating", "planning", "ready"]).optional().catch(undefined),
});
