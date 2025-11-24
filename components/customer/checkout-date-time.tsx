"use client"

import { useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimePicker } from "@/components/ui/time-picker"
import type { PreorderScheduleDate } from "@/lib/data-context"
import { 
  getAllowedHours, 
  getAllowedMinutes, 
  to12HourParts,
  formatTimeRange12h
} from "@/lib/time-utils"

interface CheckoutDateTimeProps {
  restrictionsEnabled: boolean
  hasConfiguredDates: boolean
  scheduledDates: PreorderScheduleDate[]
  selectedScheduleEntry: PreorderScheduleDate | undefined
  preOrderDate: string
  preOrderTime: string
  dateError: string
  timeError: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  onDateErrorChange: (error: string) => void
  onTimeErrorChange: (error: string) => void
  validatePreOrderDate: (date: string) => string
  validatePreOrderTime: (time: string, date: string) => string
  clampPreOrderDate: (date: string) => string
  clampPreOrderTime: (time: string) => string
  formatScheduleLabel: (entry: PreorderScheduleDate) => string
}

export function CheckoutDateTime({
  restrictionsEnabled,
  hasConfiguredDates,
  scheduledDates,
  selectedScheduleEntry,
  preOrderDate,
  preOrderTime,
  dateError,
  timeError,
  onDateChange,
  onTimeChange,
  onDateErrorChange,
  onTimeErrorChange,
  validatePreOrderDate,
  validatePreOrderTime,
  clampPreOrderDate,
  clampPreOrderTime,
  formatScheduleLabel,
}: CheckoutDateTimeProps) {
  // Calculate allowed minutes based on current time selection
  const allowedMinutesForTime = useMemo(() => {
    if (!selectedScheduleEntry || !preOrderTime || preOrderTime === "") return undefined
    const parts = to12HourParts(preOrderTime)
    // Only calculate if hour is not placeholder
    if (parts.hour === "HH" || parts.hour === "") return undefined
    return getAllowedMinutes(
      selectedScheduleEntry.startTime, 
      selectedScheduleEntry.endTime,
      parts.hour,
      parts.period as "AM" | "PM"
    )
  }, [selectedScheduleEntry, preOrderTime])

  return (
    <div className="space-y-3">
      <Label className="text-xs md:text-sm text-gray-500">Order Date & Time</Label>

      {restrictionsEnabled ? (
        hasConfiguredDates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="preorder-date-select" className="block text-[12px] text-gray-500 mb-1">
                Available dates <span className="text-red-500">*</span>
              </Label>
              <Select
                value={preOrderDate || ""}
                onValueChange={(value) => {
                  onDateChange(value)
                  const entry = scheduledDates.find((d) => d.date === value)
                  if (entry) {
                    // Reset time to empty (placeholder) when date changes to require user selection
                    onTimeChange("")
                    onTimeErrorChange("")
                  }
                  onDateErrorChange(validatePreOrderDate(value))
                }}
              >
                <SelectTrigger id="preorder-date-select" className="w-full text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {scheduledDates.map((entry) => (
                    <SelectItem key={entry.date} value={entry.date} className="text-xs">
                      {formatScheduleLabel(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preorder-time-window" className="block text-[12px] text-gray-500">
                Preferred time within the window <span className="text-red-500">*</span>
              </Label>
              <TimePicker
                id="preorder-time-window"
                value={preOrderTime}
                onChange={(value) => {
                  onTimeChange(value)
                  onTimeErrorChange(validatePreOrderTime(value, preOrderDate))
                }}
                disabled={!selectedScheduleEntry}
                allowedHours={selectedScheduleEntry ? getAllowedHours(selectedScheduleEntry.startTime, selectedScheduleEntry.endTime) : undefined}
                allowedMinutes={allowedMinutesForTime}
                hourPlaceholder="HH"
                minutePlaceholder="MM"
                startTime={selectedScheduleEntry?.startTime}
                endTime={selectedScheduleEntry?.endTime}
                hasError={!!timeError}
              />
              {selectedScheduleEntry && (
                <p className="text-[12px] text-muted-foreground">
                  Allowed window: {formatTimeRange12h(selectedScheduleEntry.startTime, selectedScheduleEntry.endTime)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            The restaurant has not published any pre-order dates yet. Please check back later or contact the store
            for updates.
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="preorder-date" className="block text-[11px] text-gray-500 mb-1">
              Date
            </Label>
            <Input
              id="preorder-date"
              type="date"
              value={preOrderDate}
              onChange={(e) => {
                const rawDate = e.target.value
                const normalizedDate = clampPreOrderDate(rawDate)
                onDateChange(normalizedDate)
                onDateErrorChange(validatePreOrderDate(normalizedDate))
              }}
              required
              className="w-full text-xs relative z-[100]"
              placeholder="mm/dd/yyyy"
            />
          </div>
          <div>
            <Label htmlFor="preorder-time" className="block text-[11px] text-gray-500 mb-1">
              Time
            </Label>
            <TimePicker
              id="preorder-time"
              value={preOrderTime}
              onChange={(value) => {
                const normalizedTime = clampPreOrderTime(value)
                onTimeChange(normalizedTime)
                onTimeErrorChange(validatePreOrderTime(normalizedTime, preOrderDate))
              }}
            />
          </div>
        </div>
      )}

      {dateError && <p className="text-sm text-red-500 mt-1">{dateError}</p>}
      {timeError && <p className="text-[12px] text-red-500 mt-1">{timeError}</p>}

      {!restrictionsEnabled && !timeError && (
        <p className="text-[12px] font-medium text-yellow-600 text-muted-foreground">
          Pre-orders are open for any date and time while restrictions are disabled.
        </p>
      )}
    </div>
  )
}

