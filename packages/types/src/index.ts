import { AGENT_BACKEND_PATHS as ALL_AGENT_BACKEND_PATHS } from "./generated/agent-contracts";
import type { AgentId as AllAgentId } from "./generated/agent-contracts";

export type {
  FitnessState,
  GroceryState,
  TripState,
  WellnessState,
} from "./generated/agent-contracts";

// Native screens only host these four agents. Keep the generated Go contracts
// intact and filter identity here so regenerating from upstream cannot widen
// the mobile public surface.
export const AGENT_ORDER = [
  "travel",
  "grocery",
  "fitness",
  "wellness",
] as const satisfies readonly AllAgentId[];

export type AgentId = (typeof AGENT_ORDER)[number];

export const AGENT_BACKEND_PATHS = {
  travel: ALL_AGENT_BACKEND_PATHS.travel,
  grocery: ALL_AGENT_BACKEND_PATHS.grocery,
  fitness: ALL_AGENT_BACKEND_PATHS.fitness,
  wellness: ALL_AGENT_BACKEND_PATHS.wellness,
} as const satisfies Record<AgentId, string>;
