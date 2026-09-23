"use client";

import { useSyncExternalStore } from "react";
import { WEEKDAYS, type Restaurant, type Weekday } from "@/lib/schema";

const LABELS: Record<Weekday, string> = {
  mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sáb", sun: "Dom",
};

type Hours = NonNullable<Restaurant["hours"]>;

function isOpenNow(hours: Hours, now: Date) {
  const day = WEEKDAYS[(now.getDay() + 6) % 7]; // JS: 0=Dom
  const ranges = hours[day];
  if (!ranges?.length) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return ranges.some((r) => {
    const [a, b] = r.split("-").map((t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    });
    return b >= a ? mins >= a && mins < b : mins >= a || mins < b; // cruza meia-noite
  });
}

export function Hours({ hours, compact }: { hours: Restaurant["hours"]; compact?: boolean }) {
  // No servidor/hidratação é null; no client vira a hora atual (evita divergir do HTML estático).
  const now = useSyncExternalStore(subscribeNoop, getNow, getServerNow);

  if (!hours) {
    return <p className="text-xs text-muted-foreground">Não cadastrado</p>;
  }

  const open = now ? isOpenNow(hours, now) : null;
  const today = now ? WEEKDAYS[(now.getDay() + 6) % 7] : null;

  if (compact) {
    const todayRanges = today ? hours[today] : null;
    return (
      <div className="text-xs leading-relaxed">
        <p>{todayRanges?.length ? `Hoje ${fmt(todayRanges)}` : "Hoje fechado"}</p>
        {open !== null && (
          <p className={open ? "font-bold text-emerald-600" : "font-bold text-rose-500"}>
            {open ? "Aberto agora" : "Fechado agora"}
          </p>
        )}
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {WEEKDAYS.map((d) => (
        <div key={d} className="contents">
          <dt className={d === today ? "font-bold" : "font-medium"}>{LABELS[d]}</dt>
          <dd className="text-muted-foreground">{hours[d]?.length ? fmt(hours[d]!) : "Fechado"}</dd>
        </div>
      ))}
    </dl>
  );
}

const fmt = (ranges: string[]) => ranges.map((r) => r.replace("-", "–").replace(/:00/g, "h")).join(", ");

const subscribeNoop = () => () => {};
let cachedNow: Date | null = null;
const getNow = () => (cachedNow ??= new Date());
const getServerNow = () => null;
