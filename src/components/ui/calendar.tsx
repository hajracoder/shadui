



"use client";

import * as React from "react";
import { DayPicker, DayPickerProps, SelectSingleEventHandler } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface CalendarProps extends Omit<DayPickerProps, "mode"> {
  className?: string;
  classNames?: DayPickerProps["classNames"];
  showOutsideDays?: boolean;
  selected?: Date;
  onSelect?: SelectSingleEventHandler;
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, classNames, showOutsideDays = true, selected, onSelect, ...props }, ref) => {
    const [month, setMonth] = React.useState(new Date());

    return (
      <div className={cn("p-3", className)} ref={ref}>
        {/* Custom Navbar */}
        <div className="flex justify-between mb-2">
          <button
            type="button"
            className="p-1 opacity-50 hover:opacity-100"
            onClick={() => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1 opacity-50 hover:opacity-100"
            onClick={() => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <DayPicker
          mode="single"
          month={month}
          selected={selected}
          onSelect={onSelect}
          onMonthChange={setMonth}
          showOutsideDays={showOutsideDays}
          classNames={{
            months: "flex flex-col sm:flex-row gap-2",
            month: "flex flex-col gap-4",
            caption: "text-center font-medium text-sm mb-2",
            table: "w-full border-collapse space-x-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "relative p-0 text-center text-sm [&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-md",
            day: "p-0 font-normal aria-selected:opacity-100",
            day_selected: "bg-primary text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "text-muted-foreground",
            day_disabled: "text-muted-foreground opacity-50",
            ...classNames,
          }}
          {...props}
        />
      </div>
    );
  }
);

Calendar.displayName = "Calendar";

export { Calendar };


