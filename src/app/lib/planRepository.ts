export interface WeeklyPlanItemInput {
  dayOfWeek?: number | null;
  slot?: string | null;
  recipeId?: string | null;
  fixedServings?: number | null;
  notes?: string | null;
  sortOrder?: number;
}

export interface WeeklyPlanInput {
  title?: string;
  items: WeeklyPlanItemInput[];
}

export interface PlanRepository {
  createWeeklyPlan: (userId: string, input: WeeklyPlanInput) => Promise<string>;
  archiveWeeklyPlan: (userId: string, weeklyPlanId: string) => Promise<void>;
}

