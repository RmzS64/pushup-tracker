import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Dumbbell, Flame, Trophy, Activity, Plus, Target, CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useYearlyGoal } from "@/hooks/use-yearly-goal";
import { usePushupStore } from "@/hooks/use-pushup-store";
import {
  REP_ACHIEVEMENTS,
  STREAK_ACHIEVEMENTS,
  getEarnedAchievements,
  getNextAchievements,
} from "@/lib/achievements";

const todayStr = format(new Date(), "yyyy-MM-dd");

const logSetSchema = z.object({
  reps: z.coerce.number().min(1, "Минимум 1 повторение"),
  notes: z.string().optional(),
  date: z.string().min(1, "Укажите дату"),
});

type LogSetFormValues = z.infer<typeof logSetSchema>;

function getDaysRemainingInYear(): number {
  const now = new Date();
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const diff = endOfYear.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function Dashboard() {
  const { toast } = useToast();
  const { goal } = useYearlyGoal();
  const { stats, dailySummary, addSet } = usePushupStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LogSetFormValues>({
    resolver: zodResolver(logSetSchema),
    defaultValues: { reps: 0, notes: "", date: todayStr },
  });

  const onSubmit = (values: LogSetFormValues) => {
    setIsSubmitting(true);
    try {
      addSet(values.reps, values.notes || undefined, values.date);
      const isToday = values.date === todayStr;
      toast({
        title: "Подход записан!",
        description: isToday
          ? `Добавлено ${values.reps} повт. на сегодня.`
          : `Добавлено ${values.reps} повт. за ${values.date}.`,
      });
      form.reset({ reps: 0, notes: "", date: todayStr });
    } catch {
      toast({
        title: "Ошибка записи",
        description: "Произошла ошибка. Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const chartData = useMemo(() => {
    return [...dailySummary]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((day) => ({
        dateStr: format(parseISO(day.date), "d MMM", { locale: ru }),
        rawDate: day.date,
        reps: day.totalReps,
      }));
  }, [dailySummary]);

  const yearReps = stats.yearReps;
  const yearRemaining = Math.max(0, goal - yearReps);
  const yearPercent = Math.min(100, Math.round((yearReps / goal) * 100));
  const daysLeft = getDaysRemainingInYear();
  const dailyTarget = yearRemaining > 0 ? Math.ceil(yearRemaining / daysLeft) : 0;

  const earnedAchievements = useMemo(
    () => getEarnedAchievements(stats.totalReps, stats.currentStreak),
    [stats]
  );

  const nextAchievements = useMemo(
    () => getNextAchievements(stats.totalReps, stats.currentStreak),
    [stats]
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Быстрая запись */}
      <Card className="border-primary/20 shadow-sm shadow-primary/5">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Записать подход
          </CardTitle>
          <CardDescription className="text-xs">
            Сегодня или за любой другой день.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
              {/* Повторения + Заметка */}
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="reps"
                  render={({ field }) => (
                    <FormItem className="w-28 flex-shrink-0">
                      <FormLabel className="text-xs text-muted-foreground">Повторения</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          className="text-center text-lg font-bold font-display h-12"
                          data-testid="input-reps"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs text-muted-foreground">Заметка</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Необязательно"
                          className="h-12"
                          data-testid="input-notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Дата */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      Дата тренировки
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-12 font-medium"
                        max={todayStr}
                        data-testid="input-date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 font-semibold text-base"
                data-testid="button-submit-set"
              >
                {isSubmitting ? "Записываем..." : "Записать подход"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Сегодня" value={stats.todayReps} icon={Activity} highlight />
        <StatCard title="Неделя" value={stats.weekReps} icon={Dumbbell} />
        <StatCard title="Серия" value={stats.currentStreak} suffix="дней" icon={Flame} iconColor="text-orange-500" />
        <StatCard title="Рекорд" value={stats.personalBest} icon={Trophy} iconColor="text-yellow-500" />
      </div>

      {/* Годовая цель */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Годовая цель — {goal.toLocaleString("ru")} отжиманий
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={yearPercent} className="flex-1 h-3" data-testid="progress-yearly" />
            <span className="text-sm font-bold font-display text-primary w-12 text-right">
              {yearPercent}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Выполнено</p>
              <p className="text-lg font-display font-bold" data-testid="stat-year-reps">
                {yearReps.toLocaleString("ru")}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Осталось</p>
              <p className="text-lg font-display font-bold" data-testid="stat-year-remaining">
                {yearRemaining.toLocaleString("ru")}
              </p>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <p className="text-[10px] text-primary/70 uppercase tracking-wide mb-0.5 flex items-center justify-center gap-0.5">
                <CalendarDays className="w-2.5 h-2.5" />
                В день
              </p>
              <p className="text-lg font-display font-bold text-primary" data-testid="stat-daily-target">
                {dailyTarget > 0 ? dailyTarget.toLocaleString("ru") : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            До конца года: {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}
          </p>
        </CardContent>
      </Card>

      {/* Достижения */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Достижения
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Отжимания</p>
            <div className="grid grid-cols-4 gap-2">
              {REP_ACHIEVEMENTS.map((a) => {
                const earned = earnedAchievements.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                      earned
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted/40 border-border opacity-40 grayscale"
                    }`}
                    data-testid={`achievement-${a.id}`}
                  >
                    <span className="text-2xl">{a.icon}</span>
                    <p className="text-[10px] font-medium leading-tight">{a.title}</p>
                    <p className="text-[9px] text-muted-foreground">{a.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Серии</p>
            <div className="grid grid-cols-4 gap-2">
              {STREAK_ACHIEVEMENTS.map((a) => {
                const earned = earnedAchievements.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                      earned
                        ? "bg-orange-500/10 border-orange-500/30"
                        : "bg-muted/40 border-border opacity-40 grayscale"
                    }`}
                    data-testid={`achievement-${a.id}`}
                  >
                    <span className="text-2xl">{a.icon}</span>
                    <p className="text-[10px] font-medium leading-tight">{a.title}</p>
                    <p className="text-[9px] text-muted-foreground">{a.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Следующее достижение */}
      {nextAchievements.length > 0 && (
        <Card className="border-primary/10">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-display">Следующее достижение</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {nextAchievements.map((next) => (
              <div key={next.achievement.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{next.achievement.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{next.achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{next.achievement.description}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary font-display">{next.progress}%</span>
                </div>
                <Progress value={next.progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {next.achievement.type === "reps"
                    ? `${next.current.toLocaleString("ru")} / ${next.achievement.threshold.toLocaleString("ru")} отжиманий`
                    : `${next.current} / ${next.achievement.threshold} дней серии`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* График */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-display">Последние 30 дней</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {chartData.length > 0 ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis
                    dataKey="dateStr"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    dy={8}
                    minTickGap={16}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover text-popover-foreground border border-border shadow-md rounded-lg p-2.5">
                            <p className="font-medium text-xs mb-0.5">{payload[0].payload.dateStr}</p>
                            <p className="font-display font-bold text-primary text-lg">{payload[0].value} повт.</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="reps" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.rawDate === todayStr
                            ? "hsl(var(--primary))"
                            : "hsl(var(--primary)/0.45)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Нет данных. Запишите первый подход!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  suffix = "",
  icon: Icon,
  highlight = false,
  iconColor = "text-primary",
}: {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  iconColor?: string;
}) {
  return (
    <Card className={highlight ? "border-primary/30 shadow-sm shadow-primary/10" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className={`p-1.5 rounded-lg ${highlight ? "bg-primary/10" : "bg-muted"}`}>
            <Icon className={`w-3.5 h-3.5 ${highlight ? "text-primary" : iconColor}`} />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="text-3xl font-display font-bold text-foreground"
            data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {value}
          </span>
          {suffix && <span className="text-xs font-medium text-muted-foreground">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
