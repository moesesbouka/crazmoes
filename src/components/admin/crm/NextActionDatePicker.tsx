import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarClock, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid, isBefore, startOfDay } from "date-fns";

interface NextActionDatePickerProps {
  value: string; // ISO date or ''
  onChange: (date: string) => void;
  compact?: boolean;
}

export function NextActionDatePicker({ value, onChange, compact }: NextActionDatePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const isOverdue = parsed && isValid(parsed) && isBefore(parsed, startOfDay(new Date()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`${compact ? "h-7 px-2 text-[11px]" : "h-8 px-3 text-xs"} ${
            isOverdue ? "text-red-400" : value ? "text-sky-400" : ""
          }`}
        >
          <CalendarClock className="h-3 w-3 mr-1" />
          {value && parsed && isValid(parsed) ? format(parsed, "MMM d") : "Set Date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsed && isValid(parsed) ? parsed : undefined}
          onSelect={(d) => {
            if (d) { onChange(format(d, "yyyy-MM-dd")); setOpen(false); }
          }}
          initialFocus
        />
        {value && (
          <div className="px-3 pb-3">
            <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground" onClick={() => { onChange(''); setOpen(false); }}>
              <X className="h-3 w-3 mr-1" /> Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Inline badge for next action date */
export function NextActionBadge({ date }: { date: string }) {
  if (!date) return null;
  const parsed = parseISO(date);
  if (!isValid(parsed)) return null;
  const overdue = isBefore(parsed, startOfDay(new Date()));
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0 rounded-full border ${
      overdue ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-sky-500/20 text-sky-400 border-sky-500/30"
    }`}>
      {overdue ? "⚠ " : ""}{format(parsed, "MMM d")}
    </span>
  );
}
