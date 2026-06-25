import { useState, useCallback, useMemo } from "react";
import {
  format,
  parseISO,
  startOfDay,
  subDays,
  differenceInCalendarDays,
  startOfWeek,
  startOfYear,
} from "date-fns";

const SETS_KEY = "pushup_sets";

export interface StoredSet {
  id: number;
  reps: number;
  notes?: string;
  createdAt: string;
}

export interface PushupStats {
  todayReps: number;
  weekReps: number;
  currentStreak: number;
  personalBest: number;
  yearReps: number;
  totalReps: number;
}

export interface DailySummary {
  date: string;
  totalReps: number;
}

function loadSets(): StoredSet[] {
  try {
    const raw = localStorage.getItem(SETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredSet[];
  } catch {
    return [];
  }
}

function saveSets(sets: StoredSet[]) {
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify(sets));
  } catch {}
}

function computeStats(sets: StoredSet[]): PushupStats {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const yearStart = startOfYear(now);

  let todayReps = 0;
  let weekReps = 0;
  let yearReps = 0;
  let totalReps = 0;
  let personalBest = 0;

  for (const s of sets) {
    const d = parseISO(s.createdAt);
    const dateStr = format(d, "yyyy-MM-dd");
    totalReps += s.reps;
    if (s.reps > personalBest) personalBest = s.reps;
    if (dateStr === todayStr) todayReps += s.reps;
    if (d >= weekStart) weekReps += s.reps;
    if (d >= yearStart) yearReps += s.reps;
  }

  const currentStreak = computeStreak(sets);

  return { todayReps, weekReps, currentStreak, personalBest, yearReps, totalReps };
}

function computeStreak(sets: StoredSet[]): number {
  if (sets.length === 0) return 0;

  const datesWithActivity = new Set(
    sets.map((s) => format(parseISO(s.createdAt), "yyyy-MM-dd"))
  );

  const sortedDates = Array.from(datesWithActivity).sort().reverse();
  if (sortedDates.length === 0) return 0;

  const today = startOfDay(new Date());
  const mostRecent = startOfDay(parseISO(sortedDates[0]));
  const gapFromToday = differenceInCalendarDays(today, mostRecent);

  if (gapFromToday > 1) return 0;

  let streak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = startOfDay(parseISO(sortedDates[i]));
    const prev = startOfDay(parseISO(sortedDates[i + 1]));
    if (differenceInCalendarDays(current, prev) === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function computeDailySummary(sets: StoredSet[], days = 30): DailySummary[] {
  const now = new Date();
  const cutoff = startOfDay(subDays(now, days - 1));

  const byDate: Record<string, number> = {};
  for (const s of sets) {
    const d = parseISO(s.createdAt);
    if (d < cutoff) continue;
    const key = format(d, "yyyy-MM-dd");
    byDate[key] = (byDate[key] ?? 0) + s.reps;
  }

  return Object.entries(byDate).map(([date, totalReps]) => ({ date, totalReps }));
}

export function usePushupStore() {
  const [sets, setSets] = useState<StoredSet[]>(loadSets);

  const addSet = useCallback(
    (reps: number, notes?: string, date?: string): StoredSet => {
      const createdAt = date
        ? new Date(`${date}T12:00:00`).toISOString()
        : new Date().toISOString();
      const newSet: StoredSet = {
        id: Date.now(),
        reps,
        notes: notes || undefined,
        createdAt,
      };
      setSets((prev) => {
        const updated = [newSet, ...prev];
        saveSets(updated);
        return updated;
      });
      return newSet;
    },
    []
  );

  const deleteSet = useCallback((id: number) => {
    setSets((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSets(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSets([]);
    try {
      localStorage.removeItem(SETS_KEY);
    } catch {}
  }, []);

  const importSets = useCallback((incoming: Omit<StoredSet, "id">[]): number => {
    let added = 0;
    setSets((prev) => {
      const existingKeys = new Set(prev.map((s) => s.createdAt));
      const newOnes: StoredSet[] = [];
      for (const item of incoming) {
        if (!existingKeys.has(item.createdAt)) {
          newOnes.push({ ...item, id: Date.now() + Math.random() });
          existingKeys.add(item.createdAt);
        }
      }
      added = newOnes.length;
      const updated = [...prev, ...newOnes];
      saveSets(updated);
      return updated;
    });
    return added;
  }, []);

  const stats = useMemo(() => computeStats(sets), [sets]);
  const dailySummary = useMemo(() => computeDailySummary(sets), [sets]);

  return { sets, stats, dailySummary, addSet, deleteSet, clearAll, importSets };
}
