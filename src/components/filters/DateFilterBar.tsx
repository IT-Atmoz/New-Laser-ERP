import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, isToday, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface DateFilterBarProps {
  onFilterChange: (filterType: "today" | "month" | "year" | "range" | "clear", dateRange?: { from: Date; to: Date }) => void;
  activeFilter: string;
}

export const DateFilterBar = ({ onFilterChange, activeFilter }: DateFilterBarProps) => {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const handleDateRangeSelect = () => {
    if (dateRange.from && dateRange.to) {
      onFilterChange("range", { from: dateRange.from, to: dateRange.to });
    }
  };

  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
    onFilterChange("clear");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={activeFilter === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange("today")}
          className={cn(
            "gap-2 transition-all",
            activeFilter === "today" && "ring-2 ring-primary ring-offset-2"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          Today
        </Button>

        <Button
          variant={activeFilter === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange("month")}
          className={cn(
            "gap-2 transition-all",
            activeFilter === "month" && "ring-2 ring-primary ring-offset-2"
          )}
        >
          This Month
        </Button>

        <Button
          variant={activeFilter === "year" ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange("year")}
          className={cn(
            "gap-2 transition-all",
            activeFilter === "year" && "ring-2 ring-primary ring-offset-2"
          )}
        >
          This Year
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={activeFilter === "range" ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-2 transition-all min-w-[200px] justify-start",
                activeFilter === "range" && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {dateRange.from && dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                </>
              ) : (
                "Custom Range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                  className="pointer-events-auto"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                  disabled={(date) => dateRange.from ? date < dateRange.from : false}
                  className="pointer-events-auto"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleDateRangeSelect}
                  disabled={!dateRange.from || !dateRange.to}
                  className="flex-1"
                >
                  Apply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearDateRange}
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearDateRange();
              onFilterChange("clear");
            }}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {activeFilter === "today" && (
        <div className="text-sm text-muted-foreground bg-primary/5 px-3 py-2 rounded-md border border-primary/20 animate-fade-in">
          Showing jobs from <span className="font-semibold text-primary">Today</span>
        </div>
      )}
      {activeFilter === "month" && (
        <div className="text-sm text-muted-foreground bg-primary/5 px-3 py-2 rounded-md border border-primary/20 animate-fade-in">
          Showing jobs from <span className="font-semibold text-primary">{format(new Date(), "MMMM yyyy")}</span>
        </div>
      )}
      {activeFilter === "year" && (
        <div className="text-sm text-muted-foreground bg-primary/5 px-3 py-2 rounded-md border border-primary/20 animate-fade-in">
          Showing jobs from <span className="font-semibold text-primary">{format(new Date(), "yyyy")}</span>
        </div>
      )}
      {activeFilter === "range" && dateRange.from && dateRange.to && (
        <div className="text-sm text-muted-foreground bg-primary/5 px-3 py-2 rounded-md border border-primary/20 animate-fade-in">
          Showing jobs from <span className="font-semibold text-primary">
            {format(dateRange.from, "MMM dd, yyyy")} to {format(dateRange.to, "MMM dd, yyyy")}
          </span>
        </div>
      )}
    </div>
  );
};

export const filterJobsByDate = (
  jobs: any[],
  filterType: string,
  customRange?: { from: Date; to: Date }
) => {
  const now = new Date();

  switch (filterType) {
    case "today":
      return jobs.filter((job) => {
        try {
          return isToday(parseISO(job.date));
        } catch {
          return false;
        }
      });

    case "month":
      return jobs.filter((job) => {
        try {
          const jobDate = parseISO(job.date);
          return isWithinInterval(jobDate, {
            start: startOfMonth(now),
            end: endOfMonth(now),
          });
        } catch {
          return false;
        }
      });

    case "year":
      return jobs.filter((job) => {
        try {
          const jobDate = parseISO(job.date);
          return isWithinInterval(jobDate, {
            start: startOfYear(now),
            end: endOfYear(now),
          });
        } catch {
          return false;
        }
      });

    case "range":
      if (!customRange) return jobs;
      return jobs.filter((job) => {
        try {
          const jobDate = parseISO(job.date);
          return isWithinInterval(jobDate, {
            start: customRange.from,
            end: customRange.to,
          });
        } catch {
          return false;
        }
      });

    default:
      return jobs;
  }
};
