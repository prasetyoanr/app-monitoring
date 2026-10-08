"use client";

import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const monthOptions = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return "Select month";
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

// The month field used by the Reports page: a button that opens a year + month grid.
// `value` and `onChange` use the YYYY-MM format.
export function MonthPicker({
  value,
  onChange,
  label = "Month",
  onOpenChange,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Lets a parent raise its stacking order while the popover is open. */
  onOpenChange?: (open: boolean) => void;
}) {
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(value.slice(0, 4)) || new Date().getFullYear());
  const rootRef = useRef<HTMLDivElement>(null);

  function changeOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        onOpenChange?.(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative w-full text-[11px] font-semibold text-slate-600 sm:w-auto">
      <span id={labelId}>{label}</span>
      <button
        type="button"
        onClick={() => {
          if (!open) setYear(Number(value.slice(0, 4)) || year);
          changeOpen(!open);
        }}
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="mt-1.5 flex h-10 w-full min-w-48 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-medium text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        <CalendarRange size={15} className="text-slate-400" />
        <span className="flex-1">{formatMonthLabel(value)}</span>
      </button>
      {open ? (
        <div role="dialog" aria-label={`Choose ${label.toLowerCase()}`} className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:left-auto sm:right-0">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setYear((current) => current - 1)} aria-label="Previous year" className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600"><ChevronLeft size={16} /></button>
            <span className="text-sm font-bold text-slate-800">{year}</span>
            <button type="button" onClick={() => setYear((current) => current + 1)} aria-label="Next year" className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600"><ChevronRight size={16} /></button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {monthOptions.map((monthName, monthIndex) => {
              const optionValue = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
              const selected = value === optionValue;
              return (
                <button
                  key={monthName}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(optionValue);
                    changeOpen(false);
                  }}
                  className={`h-10 rounded-xl text-xs font-semibold ${selected ? "bg-[#3157d5] text-white shadow-md shadow-blue-600/20" : "bg-slate-50 text-slate-600"}`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
