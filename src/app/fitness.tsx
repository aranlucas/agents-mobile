import { fitnessSummarySchema } from "@/utils/agent-summary-schemas";
import type { FitnessState } from "@/types";
import { AgentScreen, Field, SummaryCard } from "@/components/agent-screen";

const FITNESS_CONFIG = {
  id: "fitness" as const,
  summarySchema: fitnessSummarySchema,
  title: "Fitness Planner",
  subtitle: "Build a training plan tailored to your goals and routine.",
  placeholder: "Plan my training...",
  accentColor: "#2563eb",
  renderSummary: (state: FitnessState) =>
    state.training_plan || state.activities?.length ? (
      <SummaryCard>
        <Field label="Status" value={state.status} />
        <Field label="Activities" value={state.activities?.length} />
        <Field label="Training plan" value={state.training_plan} />
      </SummaryCard>
    ) : null,
};

export default function FitnessScreen() {
  return <AgentScreen<FitnessState> config={FITNESS_CONFIG} initialState={{}} />;
}
