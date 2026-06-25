export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: "reps" | "streak";
  threshold: number;
  icon: string;
}

export const REP_ACHIEVEMENTS: Achievement[] = [
  {
    id: "reps_1000",
    title: "Первый шаг",
    description: "1 000 отжиманий",
    type: "reps",
    threshold: 1000,
    icon: "🥉",
  },
  {
    id: "reps_5000",
    title: "Спортсмен",
    description: "5 000 отжиманий",
    type: "reps",
    threshold: 5000,
    icon: "🥈",
  },
  {
    id: "reps_10000",
    title: "Чемпион",
    description: "10 000 отжиманий",
    type: "reps",
    threshold: 10000,
    icon: "🥇",
  },
  {
    id: "reps_18000",
    title: "Годовая цель",
    description: "18 000 отжиманий",
    type: "reps",
    threshold: 18000,
    icon: "🏆",
  },
];

export const STREAK_ACHIEVEMENTS: Achievement[] = [
  {
    id: "streak_7",
    title: "Неделя",
    description: "7 дней подряд",
    type: "streak",
    threshold: 7,
    icon: "🔥",
  },
  {
    id: "streak_30",
    title: "Месяц",
    description: "30 дней подряд",
    type: "streak",
    threshold: 30,
    icon: "💪",
  },
  {
    id: "streak_100",
    title: "100 дней",
    description: "100 дней подряд",
    type: "streak",
    threshold: 100,
    icon: "⚡",
  },
  {
    id: "streak_365",
    title: "Целый год",
    description: "365 дней подряд",
    type: "streak",
    threshold: 365,
    icon: "👑",
  },
];

export const ALL_ACHIEVEMENTS = [...REP_ACHIEVEMENTS, ...STREAK_ACHIEVEMENTS];

export function getEarnedAchievements(totalReps: number, streak: number): Set<string> {
  const earned = new Set<string>();
  for (const a of REP_ACHIEVEMENTS) {
    if (totalReps >= a.threshold) earned.add(a.id);
  }
  for (const a of STREAK_ACHIEVEMENTS) {
    if (streak >= a.threshold) earned.add(a.id);
  }
  return earned;
}

export interface NextAchievement {
  achievement: Achievement;
  current: number;
  progress: number;
}

export function getNextAchievements(totalReps: number, streak: number): NextAchievement[] {
  const results: NextAchievement[] = [];

  const nextRep = REP_ACHIEVEMENTS.find((a) => totalReps < a.threshold);
  if (nextRep) {
    const prev = REP_ACHIEVEMENTS[REP_ACHIEVEMENTS.indexOf(nextRep) - 1];
    const base = prev ? prev.threshold : 0;
    results.push({
      achievement: nextRep,
      current: totalReps,
      progress: Math.min(100, Math.round(((totalReps - base) / (nextRep.threshold - base)) * 100)),
    });
  }

  const nextStreak = STREAK_ACHIEVEMENTS.find((a) => streak < a.threshold);
  if (nextStreak) {
    const prev = STREAK_ACHIEVEMENTS[STREAK_ACHIEVEMENTS.indexOf(nextStreak) - 1];
    const base = prev ? prev.threshold : 0;
    results.push({
      achievement: nextStreak,
      current: streak,
      progress: Math.min(100, Math.round(((streak - base) / (nextStreak.threshold - base)) * 100)),
    });
  }

  return results;
}
