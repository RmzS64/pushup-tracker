import { useState } from "react";

const STORAGE_KEY = "pushup_yearly_goal";
const DEFAULT_GOAL = 18000;

export function useYearlyGoal() {
  const [goal, setGoalState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return DEFAULT_GOAL;
  });

  const setGoal = (value: number) => {
    setGoalState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  };

  return { goal, setGoal };
}
