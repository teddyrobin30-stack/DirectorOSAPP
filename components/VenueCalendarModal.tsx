// src/components/VenueCalendarModal.tsx
import React, { useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, MapPin, Filter } from "lucide-react";
import { Group, Venue, UserSettings } from "../types";

interface VenueCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  venues: Venue[];
  userSettings: UserSettings;
  onGroupClick: (group: Group) => void;
}

type CalendarView = "month" | "week";

type FlatEvent = {
  id: string;
  groupId: string | number;
  group: Group;
  title: string;
  description: string;
  venue: string;
  start: Date;
  end: Date;
  duration: number;
  color: string;
};

type InvoiceItemLike = {
  id?: string | number;
  date?: any;
  time?: string;
  endTime?: string;
  location?: string;
  description?: string;
};

const getDurationInHours = (description: string) => {
  const lower = (description || "").toLowerCase();
  if (lower.includes("journée") || lower.includes("séminaire")) return 8;
  if (lower.includes("demi") || lower.includes("matin") || lower.includes("après-midi")) return 4;
  if (lower.includes("dîner") || lower.includes("dejeuner") || lower.includes("déjeuner") || lower.includes("soirée"))
    return 3;
  if (lower.includes("cocktail")) return 2;
  return 1;
};

const toValidDate = (input: any): Date | null => {
  if (!input) return null;

  // Firestore Timestamp
  if (typeof input === "object" && typeof input.seconds === "number") {
    const d = new Date(input.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseTime = (time: any, fallback: string) => {
  const raw = String(time ?? fallback);
  const [hStr, mStr] = raw.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  return {
    h: Number.isFinite(h) ? h : 9,
    m: Number.isFinite(m) ? m : 0,
  };
};

const isSameDay = (d1: Date, d2: Date) =>
  d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

const getWeekDays = (date: Date) => {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  startOfWeek.setDate(diff);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }
  return days;
};

const getMonthDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: Array<Date | null> = [];
  let startDay = firstDay.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1; // Mon=0

  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));

  return days;
};

const VenueCalendarModal: React.FC<VenueCalendarModalProps> = ({
  isOpen,
  onClose,
  groups,
  venues,
  userSettings,
  onGroupClick,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [selectedVenueId, setSelectedVenueId] = useState<string>("ALL");

  const themeClass = `bg-${userSettings.themeColor}-600`;
  const themeText = `text-${userSettings.themeColor}-600`;

  const events = useMemo<FlatEvent[]>(() => {
    const allEvents: FlatEvent[] = [];
    const safeGroups = (groups ?? []).filter(Boolean) as any[];

    safeGroups.forEach((group: any) => {
      const invoiceItems: InvoiceItemLike[] = Array.isArray(group?.invoiceItems) ? group.invoiceItems : [];
      if (!invoiceItems.length) return;

      invoiceItems.forEach((item) => {
        const venueName = String(item?.location ?? "").trim();
        const dateBase = toValidDate(item?.date);

        if (!dateBase || !venueName) return;

        const { h, m } = parseTime(item?.time, "09:00");
        const start = new Date(dateBase);
        start.setHours(h, m, 0, 0);

        const desc = String(item?.description ?? "");
        let end: Date;
        let duration: number;

        if (item?.endTime) {
          const { h: eh, m: em } = parseTime(item.endTime, "10:00");
          end = new Date(dateBase);
          end.setHours(eh, em, 0, 0);
          duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

          // If end < start, fallback to heuristic duration
          if (!Number.isFinite(duration) || duration <= 0) {
            duration = getDurationInHours(desc);
            end = new Date(start);
            end.setHours(start.getHours() + duration);
          }
        } else {
          duration = getDurationInHours(desc);
          end = new Date(start);
          end.setHours(start.getHours() + duration);
        }

        allEvents.push({
          id: `${String(group?.id ?? "g")}-${String(item?.id ?? `${start.getTime()}-${venueName}`)}`,
          groupId: group?.id ?? "unknown",
          group: group as Group,
          title: String(group?.name ?? "Groupe"),
          description: desc,
          venue: venueName,
          start,
          end,
          duration: Math.max(0.5, Number.isFinite(duration) ? duration : 1),
          color: group?.status === "confirmed" ? "bg-emerald-500" : "bg-amber-400",
        });
      });
    });

    return allEvents;
  }, [groups]);

  const filteredEvents = useMemo(() => {
    const safeVenues = venues ?? [];
    if (selectedVenueId === "ALL") return events;

    const venueName = safeVenues.find((v) => String(v.id) === String(selectedVenueId))?.name;
    if (!venueName) return [];

    return events.filter((e) => e.venue === venueName);
  }, [events, selectedVenueId, venues]);

  const changeDate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 flex items-center justify-center animate-in fade-in backdrop-blur-sm p-2 md:p-6">
      <div
        className={`w-full max-w-7xl rounded-[32px] p-4 md:p-6 shadow-2xl flex flex-col h-[95vh] md:h-[90vh] ${
          userSettings.darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 shrink-0 gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`p-3 rounded-2xl ${userSettings.darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
              <MapPin size={24} className={themeText} />
            </div>
            <div>
              <h2 className="text-xl font-black">Calendrier des Lieux</h2>
              <p className="text-xs text-slate-400 font-bold hidden md:block">Occupation des espaces</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
            {/* View Switcher */}
            <div className={`flex p-1 rounded-xl ${userSettings.darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
              <button
                onClick={() => setView("week")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                  view === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
                type="button"
              >
                Semaine
              </button>
              <button
                onClick={() => setView("month")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                  view === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
                type="button"
              >
                Mois
              </button>
            </div>

            {/* Venue Filter */}
            <div className="relative">
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-bold uppercase outline-none border-2 cursor-pointer ${
                  userSettings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <option value="ALL">Tous les lieux</option>
                {(venues ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <Filter size={12} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 ml-auto md:ml-0">
              <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors" type="button">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black uppercase w-28 text-center truncate">
                {view === "month"
                  ? currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
                  : `Sem. ${currentDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
              </span>
              <button onClick={() => changeDate(1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors" type="button">
                <ChevronRight size={16} />
              </button>
            </div>

            <button onClick={onClose} className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 shrink-0" type="button">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden border rounded-3xl border-slate-200 dark:border-slate-800 relative bg-white dark:bg-slate-900/50">
          {/* WEEK VIEW */}
          {view === "week" && (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Days Header */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 pr-[6px]">
                <div className="w-16 border-r border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-800/50" />
                <div className="flex-1 grid grid-cols-7">
                  {getWeekDays(currentDate).map((day, i) => (
                    <div
                      key={i}
                      className={`p-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-0 ${
                        isSameDay(day, new Date()) ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                      }`}
                    >
                      <span className="block text-[9px] font-black uppercase text-slate-400">
                        {day.toLocaleDateString("fr-FR", { weekday: "short" })}
                      </span>
                      <span className={`text-lg font-black ${isSameDay(day, new Date()) ? themeText : ""}`}>{day.getDate()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Grid Scrollable */}
              <div className="flex-1 overflow-y-auto relative no-scrollbar">
                <div className="flex min-h-[1440px]">
                  {/* Time Axis */}
                  <div className="w-16 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 shrink-0 text-[10px] font-bold text-slate-400 text-center pt-2">
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div key={h} className="h-[60px] border-b border-slate-100 dark:border-slate-800/50 relative">
                        <span className="-top-2 relative">{h}:00</span>
                      </div>
                    ))}
                  </div>

                  {/* Columns */}
                  <div className="flex-1 grid grid-cols-7 relative">
                    {/* Grid Lines */}
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div
                        key={`line-${h}`}
                        className="absolute w-full border-b border-slate-100 dark:border-slate-800 pointer-events-none"
                        style={{ top: h * 60, height: 60 }}
                      />
                    ))}

                    {getWeekDays(currentDate).map((day, i) => {
                      const dayEvents = filteredEvents.filter((e) => isSameDay(e.start, day));

                      return (
                        <div key={i} className="relative border-r border-slate-200 dark:border-slate-800 last:border-0 h-[1440px]">
                          {dayEvents.map((evt) => {
                            const top = evt.start.getHours() * 60 + evt.start.getMinutes();
                            const height = Math.max(40, evt.duration * 60);

                            return (
                              <div
                                key={evt.id}
                                onClick={() => onGroupClick(evt.group)}
                                className={`absolute left-1 right-1 rounded-xl p-2 cursor-pointer shadow-sm border border-black/5 hover:scale-[1.02] transition-transform z-10 overflow-hidden flex flex-col justify-center ${evt.color} text-white`}
                                style={{ top: `${top}px`, height: `${height}px` }}
                                title={`${evt.title} - ${evt.venue}`}
                              >
                                <p className="text-[10px] font-black leading-tight truncate">
                                  {evt.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                                  {evt.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                                <p className="font-bold text-xs leading-tight truncate">{evt.title}</p>
                                <div className="flex items-center gap-1 mt-0.5 opacity-90">
                                  <MapPin size={8} />
                                  <span className="text-[9px] font-medium truncate">{evt.venue}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MONTH VIEW */}
          {view === "month" && (
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                  <div key={d} className="py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    {d}
                  </div>
                ))}
              </div>

              <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                {getMonthDays(currentDate).map((day, i) => {
                  if (!day) {
                    return (
                      <div
                        key={i}
                        className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-r border-slate-200 dark:border-slate-800"
                      />
                    );
                  }

                  const dayEvents = filteredEvents.filter((e) => isSameDay(e.start, day));
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={i}
                      className={`border-b border-r border-slate-200 dark:border-slate-800 p-2 min-h-[100px] flex flex-col gap-1 ${
                        isToday ? "bg-indigo-50/30 dark:bg-indigo-900/10" : ""
                      }`}
                    >
                      <span
                        className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? `${themeClass} text-white` : "text-slate-500"
                        }`}
                      >
                        {day.getDate()}
                      </span>

                      <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                        {dayEvents.map((evt) => (
                          <div
                            key={evt.id}
                            onClick={() => onGroupClick(evt.group)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold truncate cursor-pointer hover:opacity-80 transition-opacity ${evt.color} text-white`}
                            title={`${evt.title} (${evt.venue})`}
                          >
                            {evt.start.getHours().toString().padStart(2, "0")}:{evt.start.getMinutes().toString().padStart(2, "0")} {evt.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VenueCalendarModal;

