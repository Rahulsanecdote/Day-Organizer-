// Discriminated union types for PlanOutput stats.
// Guarantees each plan shape is handled explicitly at every consumer.

export type PlanType = 'regular' | 'late-night';

interface BaseStats {
  planType: PlanType;
}

export interface RegularPlanStats extends BaseStats {
  planType: 'regular';
  workHours: number;
  gymMinutes: number;
  habitsCompleted: number;
  tasksCompleted: number;
  focusBlocks: number;
  freeTimeRemaining: number;
}

export interface LateNightPlanStats extends BaseStats {
  planType: 'late-night';
  totalFocusTimeMinutes: number;
  totalFreeTimeMinutes: number;
  completionRate: number;
}

export type PlanStats = RegularPlanStats | LateNightPlanStats;

// Type guard helpers — always use these before accessing plan-type-specific fields.
export const isRegularPlan = (s: PlanStats): s is RegularPlanStats =>
  s.planType === 'regular';

export const isLateNightPlan = (s: PlanStats): s is LateNightPlanStats =>
  s.planType === 'late-night';
