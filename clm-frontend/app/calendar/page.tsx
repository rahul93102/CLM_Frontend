'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { ApiClient, CalendarEvent } from '../lib/api-client';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

type ViewMode = 'month' | 'week' | 'list';

type ContractOption = { id: string; title: string };

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const pad2 = (n: number) => String(n).padStart(2, '0');

const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toISODateTimeLocal = (d: Date) =>
  `${toISODate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const parseISO = (s: string) => new Date(s);

const monthLabel = (d: Date) =>
  d.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

const weekdayShort = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const colorForCategory = (category: CalendarEvent['category']) => {
  switch (category) {
    case 'renewal':
      return {
        pill: 'bg-orange-50 text-orange-700 border-orange-200',
        chip: 'bg-orange-100 text-orange-700',
      };
    case 'expiry':
      return {
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
        chip: 'bg-rose-100 text-rose-700',
      };
    default:
      return {
        pill: 'bg-sky-50 text-sky-700 border-sky-200',
        chip: 'bg-sky-100 text-sky-700',
      };
  }
};

const overlapsDay = (ev: CalendarEvent, day: Date) => {
  const start = parseISO(ev.start_datetime);
  const end = parseISO(ev.end_datetime);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
  return start <= dayEnd && end >= dayStart;
};

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [monthCursor, setMonthCursor] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contracts, setContracts] = useState<ContractOption[]>([]);

  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<CalendarEvent['category']>('meeting');
  const [formContractId, setFormContractId] = useState<string>('');
  const [formStart, setFormStart] = useState<string>(() => toISODateTimeLocal(new Date()));
  const [formEnd, setFormEnd] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return toISODateTimeLocal(d);
  });

  const monthRange = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const end = endOfMonth(monthCursor);
    // grid starts on Sunday
    const gridStart = addDays(start, -start.getDay());
    const gridEnd = addDays(end, 6 - end.getDay());
    return { start, end, gridStart, gridEnd };
  }, [monthCursor]);

  const weekRange = useMemo(() => {
    const start = addDays(selectedDay, -selectedDay.getDay());
    const end = addDays(start, 6);
    return { start, end };
  }, [selectedDay]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) days.push(addDays(weekRange.start, i));
    return days;
  }, [weekRange.start]);

  const gridDays = useMemo(() => {
    const days: Date[] = [];
    let cur = new Date(monthRange.gridStart);
    while (cur <= monthRange.gridEnd) {
      days.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    return days;
  }, [monthRange.gridStart, monthRange.gridEnd]);

  const dayEvents = useMemo(() => {
    return events.filter((e) => overlapsDay(e, selectedDay));
  }, [events, selectedDay]);

  const monthEventsFiltered = useMemo(() => {
    const list = events.filter((e) => {
      const d = parseISO(e.start_datetime);
      return d.getFullYear() === monthCursor.getFullYear() && d.getMonth() === monthCursor.getMonth();
    });
    return list;
  }, [events, monthCursor]);

  const loadMonth = async () => {
    setBusy(true);
    setError(null);
    try {
      const client = new ApiClient();
      const start = toISODate(monthRange.gridStart);
      const end = toISODate(addDays(monthRange.gridEnd, 1));
      const res = await client.listCalendarEvents({ start, end });
      if (!res.success) throw new Error(res.error || 'Failed to load events');
      setEvents((res.data as any)?.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setBusy(false);
    }
  };

  const loadContracts = async () => {
    try {
      const client = new ApiClient();
      const res = await client.getContracts({ page_size: '50' } as any);
      if (!res.success) return;
      const results = (res.data as any)?.results || (res.data as any) || [];
      const mapped: ContractOption[] = (Array.isArray(results) ? results : []).map((c: any) => ({
        id: String(c.id || c.contract_id || ''),
        title: String(c.title || c.name || 'Untitled'),
      })).filter((c) => c.id);
      setContracts(mapped);
    } catch {
      // optional
    }
  };

  useEffect(() => {
    void loadMonth();
  }, [monthRange.gridStart, monthRange.gridEnd]);

  useEffect(() => {
    void loadContracts();
  }, []);

  const resetFormForDay = (day: Date) => {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(day);
    end.setHours(10, 0, 0, 0);
    setEditingEvent(null);
    setFormTitle('');
    setFormSummary('');
    setFormDescription('');
    setFormCategory('meeting');
    setFormContractId('');
    setFormStart(toISODateTimeLocal(start));
    setFormEnd(toISODateTimeLocal(end));
  };

  const startCreate = (day: Date) => {
    setSelectedDay(day);
    resetFormForDay(day);
  };

  const startEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title || '');
    setFormSummary(ev.summary || '');
    setFormDescription(ev.description || '');
    setFormCategory(ev.category || 'meeting');
    setFormContractId(ev.associated_contract_id || '');

    const s = parseISO(ev.start_datetime);
    const e = parseISO(ev.end_datetime);
    setFormStart(toISODateTimeLocal(s));
    setFormEnd(toISODateTimeLocal(e));

    setSelectedDay(s);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const client = new ApiClient();
      const contractTitle = contracts.find((c) => c.id === formContractId)?.title || '';
      const payload: Partial<CalendarEvent> = {
        title: formTitle.trim() || 'Untitled Event',
        summary: formSummary.trim(),
        description: formDescription.trim(),
        category: formCategory,
        associated_contract_id: formContractId ? formContractId : null,
        associated_contract_title: contractTitle,
        start_datetime: new Date(formStart).toISOString(),
        end_datetime: new Date(formEnd).toISOString(),
        all_day: false,
      };

      if (editingEvent) {
        const res = await client.updateCalendarEvent(editingEvent.id, payload);
        if (!res.success) throw new Error(res.error || 'Failed to update event');
      } else {
        const res = await client.createCalendarEvent(payload);
        if (!res.success) throw new Error(res.error || 'Failed to create event');
      }

      await loadMonth();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save event');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editingEvent) return;
    if (!window.confirm('Delete this event?')) return;

    setBusy(true);
    setError(null);
    try {
      const client = new ApiClient();
      const res = await client.deleteCalendarEvent(editingEvent.id);
      if (!res.success) throw new Error(res.error || 'Failed to delete event');
      setEditingEvent(null);
      resetFormForDay(selectedDay);
      await loadMonth();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete event');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900">Calendar &amp; Events</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[28px] p-5 md:p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-xl font-extrabold text-slate-900">{monthLabel(monthCursor)}</div>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                      onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                      onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3">
                  <div className="inline-flex rounded-xl bg-slate-100 p-1">
                    {(['month', 'week', 'list'] as ViewMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setViewMode(m)}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${
                          viewMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        {m === 'month' ? 'Month' : m === 'week' ? 'Week' : 'List'}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-[#FF5C7A] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#ff4a6c]"
                    onClick={() => startCreate(selectedDay)}
                  >
                    <Plus className="w-4 h-4" />
                    Add Event
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {/* Month grid */}
              <div className="mt-5 rounded-2xl border border-slate-200 overflow-hidden">
                {viewMode === 'month' && (
                  <>
                    <div className="grid grid-cols-7 bg-slate-50">
                      {weekdayShort.map((w) => (
                        <div key={w} className="px-3 py-2 text-[11px] font-bold text-slate-500 tracking-wide">
                          {w}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7">
                      {gridDays.map((day) => {
                        const inMonth = day.getMonth() === monthCursor.getMonth();
                        const active = isSameDay(day, selectedDay);
                        const dayList = events.filter((e) => overlapsDay(e, day));
                        const shown = dayList.slice(0, 2);
                        const overflow = Math.max(dayList.length - shown.length, 0);

                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => {
                              setSelectedDay(day);
                              if (!editingEvent) resetFormForDay(day);
                            }}
                            onDoubleClick={() => startCreate(day)}
                            className={`min-h-[92px] border-t border-slate-200 border-r border-slate-200 text-left px-3 py-2 transition hover:bg-slate-50 ${
                              !inMonth ? 'bg-slate-50/60 text-slate-400' : 'bg-white'
                            } ${active ? 'outline outline-2 outline-[#FF5C7A] outline-offset-[-2px]' : ''}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className={`text-sm font-semibold ${inMonth ? 'text-slate-900' : 'text-slate-400'}`}>{day.getDate()}</div>
                              {isSameDay(day, new Date()) && (
                                <div className="text-[10px] font-bold text-white bg-[#FF5C7A] rounded-full px-2 py-0.5">Today</div>
                              )}
                            </div>

                            <div className="mt-2 space-y-1">
                              {shown.map((ev) => {
                                const c = colorForCategory(ev.category);
                                return (
                                  <div
                                    key={ev.id}
                                    className={`text-[10px] font-semibold rounded-md px-2 py-1 truncate ${c.chip}`}
                                    title={ev.title}
                                  >
                                    {ev.title}
                                  </div>
                                );
                              })}
                              {overflow > 0 && <div className="text-[10px] font-semibold text-slate-500">+{overflow} more</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {viewMode === 'week' && (
                  <>
                    <div className="grid grid-cols-7 bg-slate-50">
                      {weekDays.map((d) => (
                        <div key={d.toISOString()} className="px-3 py-2">
                          <div className="text-[11px] font-bold text-slate-500 tracking-wide">{weekdayShort[d.getDay()]}</div>
                          <div className="text-sm font-extrabold text-slate-900">{d.getDate()}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {weekDays.map((day) => {
                        const active = isSameDay(day, selectedDay);
                        const dayList = events.filter((e) => overlapsDay(e, day));
                        const shown = dayList.slice(0, 3);
                        const overflow = Math.max(dayList.length - shown.length, 0);
                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => {
                              setSelectedDay(day);
                              if (!editingEvent) resetFormForDay(day);
                            }}
                            onDoubleClick={() => startCreate(day)}
                            className={`min-h-[140px] border-t border-slate-200 border-r border-slate-200 text-left px-3 py-2 transition hover:bg-slate-50 bg-white ${
                              active ? 'outline outline-2 outline-[#FF5C7A] outline-offset-[-2px]' : ''
                            }`}
                          >
                            <div className="mt-1 space-y-1">
                              {shown.map((ev) => {
                                const c = colorForCategory(ev.category);
                                return (
                                  <div
                                    key={ev.id}
                                    className={`text-[10px] font-semibold rounded-md px-2 py-1 truncate ${c.chip}`}
                                    title={ev.title}
                                  >
                                    {ev.title}
                                  </div>
                                );
                              })}
                              {overflow > 0 && <div className="text-[10px] font-semibold text-slate-500">+{overflow} more</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {viewMode === 'list' && (
                  <div className="divide-y divide-slate-100">
                    {monthEventsFiltered.length === 0 ? (
                      <div className="px-5 py-6 text-sm text-slate-500">No events this month</div>
                    ) : (
                      monthEventsFiltered
                        .slice()
                        .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
                        .map((ev) => {
                          const d = parseISO(ev.start_datetime);
                          const t = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              className="w-full px-5 py-4 text-left hover:bg-slate-50"
                              onClick={() => startEdit(ev)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-slate-900 truncate">{ev.title}</div>
                                  <div className="text-xs text-slate-500">
                                    {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {t}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 text-xs text-slate-500">Tip: double-click a day to create an event.</div>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-[28px] p-5 md:p-6 shadow-sm h-full">
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold text-slate-900">Event Details</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                    aria-label="Edit"
                    onClick={() => {
                      if (dayEvents[0]) startEdit(dayEvents[0]);
                    }}
                    disabled={!dayEvents[0]}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                    aria-label="Delete"
                    onClick={remove}
                    disabled={!editingEvent}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center">
                  <div className="text-[10px] font-extrabold text-rose-500">{selectedDay.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</div>
                  <div className="text-sm font-extrabold text-slate-900">{selectedDay.getDate()}</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{selectedDay.toLocaleDateString(undefined, { weekday: 'long' })}</div>
                  <div className="text-xs text-slate-500">{dayEvents.length} Events scheduled</div>
                </div>
              </div>

              {dayEvents.length > 0 && (
                <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-white border-b border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500 tracking-wide">TODAY'S EVENTS</div>
                  </div>
                  <div className="divide-y divide-slate-100 bg-white">
                    {dayEvents.slice(0, 5).map((ev) => {
                      const s = parseISO(ev.start_datetime);
                      const e = parseISO(ev.end_datetime);
                      const label = `${s.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                      const active = editingEvent?.id === ev.id;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${active ? 'bg-rose-50/60' : ''}`}
                          onClick={() => startEdit(ev)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-slate-900 truncate">{ev.title}</div>
                              <div className="text-xs text-slate-500">{label}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {dayEvents.length > 5 && (
                      <div className="px-4 py-3 text-xs text-slate-500">+{dayEvents.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 tracking-wide">EVENT TITLE</div>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    placeholder="Vendor Renewal"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 tracking-wide">START</div>
                    <input
                      type="datetime-local"
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 tracking-wide">END</div>
                    <input
                      type="datetime-local"
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-500 tracking-wide">ASSOCIATED CONTRACT</div>
                  <div className="mt-2 relative">
                    <select
                      value={formContractId}
                      onChange={(e) => setFormContractId(e.target.value)}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    >
                      <option value="">Select contract</option>
                      {contracts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <CalendarDays className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-500 tracking-wide">SUMMARY</div>
                  <input
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    placeholder="Short summary"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-500 tracking-wide">DESCRIPTION</div>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={4}
                    className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
                    placeholder="Discussion about renewal terms..."
                  />
                </div>

                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="w-full mt-2 inline-flex items-center justify-center rounded-full bg-[#FF5C7A] text-white px-6 py-3 text-sm font-extrabold hover:bg-[#ff4a6c] disabled:opacity-60"
                >
                  Save Changes
                </button>

                <div className="text-xs text-slate-500">
                  {busy ? 'Working…' : editingEvent ? 'Editing existing event' : 'Creating new event'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
