import { useMemo, useRef } from "react";
import { format, parseISO, parse } from "date-fns";
import { ru } from "date-fns/locale";
import { Trash2, RotateCcw, Download, Upload } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePushupStore, StoredSet } from "@/hooks/use-pushup-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function parseCsv(text: string): Omit<StoredSet, "id">[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const results: Omit<StoredSet, "id">[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
    const [dateStr, timeStr, repsStr, notes] = cols;
    if (!dateStr || !timeStr || !repsStr) continue;
    const reps = parseInt(repsStr, 10);
    if (isNaN(reps) || reps < 1) continue;
    try {
      const d = parse(`${dateStr} ${timeStr}`, "dd.MM.yyyy HH:mm", new Date());
      if (isNaN(d.getTime())) continue;
      results.push({ reps, notes: notes || undefined, createdAt: d.toISOString() });
    } catch {
      continue;
    }
  }
  return results;
}

export default function History() {
  const { sets, deleteSet, clearAll, importSets } = usePushupStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupedSets = useMemo(() => {
    const sortedSets = [...sets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sortedSets.reduce((groups: Record<string, StoredSet[]>, set) => {
      const dateStr = format(parseISO(set.createdAt), "yyyy-MM-dd");
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(set);
      return groups;
    }, {});
  }, [sets]);

  const handleDelete = (id: number) => {
    deleteSet(id);
    toast({ title: "Подход удалён", description: "Подход удалён из истории." });
  };

  const handleClearAll = () => {
    clearAll();
    toast({
      title: "Данные сброшены",
      description: "Вся история тренировок удалена.",
      variant: "destructive",
    });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast({
          title: "Не удалось импортировать",
          description: "Файл пуст или не соответствует формату экспорта.",
          variant: "destructive",
        });
        return;
      }
      const added = importSets(parsed);
      toast({
        title: "Импорт выполнен",
        description:
          added > 0
            ? `Добавлено ${added} новых подходов.`
            : "Все подходы из файла уже есть в истории.",
      });
    };
    reader.onerror = () => {
      toast({ title: "Ошибка чтения файла", variant: "destructive" });
    };
    reader.readAsText(file, "utf-8");
  };

  const handleExport = () => {
    const sorted = [...sets].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const rows = [
      ["Дата", "Время", "Повторения", "Заметка"],
      ...sorted.map((s) => {
        const d = parseISO(s.createdAt);
        return [
          format(d, "dd.MM.yyyy"),
          format(d, "HH:mm"),
          String(s.reps),
          s.notes ? `"${s.notes.replace(/"/g, '""')}"` : "",
        ];
      }),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `отжимания_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Экспорт готов", description: `Скачано ${sets.length} подходов.` });
  };

  const dateKeys = Object.keys(groupedSets).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (dateKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
          data-testid="input-import-file"
        />
        <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-7 h-7 text-muted-foreground opacity-40" />
        </div>
        <h2 className="text-xl font-display font-bold mb-2">История пуста</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Запишите первый подход на главной странице.
        </p>
        <Button variant="outline" size="sm" onClick={handleImportClick} className="gap-1.5">
          <Upload className="w-4 h-4" />
          Восстановить из CSV
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight mb-1">История</h1>
          <p className="text-sm text-muted-foreground">Все ваши отжимания по дням.</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-import-file"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            className="gap-1.5"
            data-testid="button-import"
          >
            <Upload className="w-4 h-4" />
            Импорт
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-1.5"
            data-testid="button-export"
          >
            <Download className="w-4 h-4" />
            Экспорт
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {dateKeys.map((dateStr) => {
          const daySets = groupedSets[dateStr];
          const displayDate = format(parseISO(dateStr), "EEEE, d MMMM yyyy", { locale: ru });
          const dayTotal = daySets.reduce((sum, s) => sum + s.reps, 0);

          return (
            <Card key={dateStr} className="overflow-hidden">
              <CardHeader className="bg-secondary/30 py-2.5 px-4 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium font-sans capitalize">
                  {displayDate}
                </CardTitle>
                <div className="text-xs font-bold text-primary font-display">
                  {dayTotal} повт.
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/50">
                  {daySets.map((set) => (
                    <li
                      key={set.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-2xl font-display font-bold text-foreground"
                            data-testid={`history-reps-${set.id}`}
                          >
                            {set.reps}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">повт.</span>
                        </div>
                        {set.notes && (
                          <p className="text-xs text-muted-foreground italic bg-muted/50 py-1 px-2 rounded-md border border-border/50 inline-block mt-0.5">
                            «{set.notes}»
                          </p>
                        )}
                        <span className="text-[10px] text-muted-foreground opacity-70 mt-0.5">
                          {format(parseISO(set.createdAt), "HH:mm")}
                        </span>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Удалить</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить подход?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Подход ({set.reps} повт.) будет навсегда удалён из истории. Это
                              действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(set.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`delete-set-${set.id}`}
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Сброс всех данных */}
      <div className="pt-2 pb-4">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Сбросить все данные</p>
              <p className="text-xs text-muted-foreground">
                Удалит всю историю тренировок безвозвратно.
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                data-testid="button-reset-all"
              >
                Сбросить все результаты
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Сбросить все результаты?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие удалит{" "}
                  <span className="font-semibold text-foreground">
                    {sets.length} {sets.length === 1 ? "подход" : sets.length < 5 ? "подхода" : "подходов"}
                  </span>{" "}
                  из вашей истории. Восстановить данные будет невозможно.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="confirm-reset-all"
                >
                  Да, сбросить всё
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
