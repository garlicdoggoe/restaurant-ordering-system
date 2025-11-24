"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NumericDropdownInput } from "@/components/ui/numeric-dropdown-input"
import { 
  HOURS_12, 
  MINUTES_60, 
  PERIODS, 
  to12HourParts, 
  to24HourString, 
  determinePeriod 
} from "@/lib/time-utils"

export interface TimePickerProps {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  allowedHours?: string[]
  allowedMinutes?: string[]
  hourPlaceholder?: string
  minutePlaceholder?: string
  startTime?: string
  endTime?: string
  hasError?: boolean
}

export function TimePicker({ 
  id, 
  value, 
  onChange, 
  disabled,
  allowedHours,
  allowedMinutes,
  hourPlaceholder = "HH",
  minutePlaceholder = "MM",
  startTime,
  endTime,
  hasError = false,
}: TimePickerProps) {
  // Handle empty/placeholder values - parse current value
  const isEmpty = !value || value === ""
  const parts = isEmpty ? { hour: hourPlaceholder, minute: minutePlaceholder, period: "PM" as "AM" | "PM" } : to12HourParts(value)
  
  // Use local state to track hour and minute separately so we can update them independently
  const [localHour, setLocalHour] = useState(parts.hour)
  const [localMinute, setLocalMinute] = useState(parts.minute)
  const [localPeriod, setLocalPeriod] = useState<"AM" | "PM">(parts.period as "AM" | "PM")
  
  // Sync local state when value prop changes (e.g., when date changes)
  useEffect(() => {
    const newParts = isEmpty ? { hour: hourPlaceholder, minute: minutePlaceholder, period: "PM" as "AM" | "PM" } : to12HourParts(value)
    setLocalHour(newParts.hour)
    setLocalMinute(newParts.minute)
    setLocalPeriod(newParts.period as "AM" | "PM")
  }, [value, isEmpty, hourPlaceholder, minutePlaceholder])

  // Update the parent component - call onChange to allow minute options to be recalculated
  // Use temporary minute "00" if minute is still placeholder, so parent can calculate allowed minutes
  const updateParent = (hour: string, minute: string, period: "AM" | "PM") => {
    // If hour is valid, always update parent (even if minute is placeholder)
    // This allows the parent to recalculate minute options based on the selected hour
    if (hour !== hourPlaceholder) {
      const effectiveMinute = minute !== minutePlaceholder ? minute : "00"
      onChange(to24HourString(hour, effectiveMinute, period))
    } else if (minute !== minutePlaceholder && hour !== hourPlaceholder) {
      // If minute is valid but hour is placeholder, don't update (shouldn't happen)
      onChange(to24HourString(hour, minute, period))
    }
  }

  // Use filtered options if provided, otherwise use all options
  const hourOptions = allowedHours ?? HOURS_12
  const minuteOptions = allowedMinutes ?? MINUTES_60

  return (
    <div className="flex flex-wrap gap-1.5" id={id}>
      <NumericDropdownInput
        value={localHour}
        onChange={(val) => {
          if (val !== hourPlaceholder) {
            setLocalHour(val)
            // Automatically determine period based on schedule window when hour changes
            const autoPeriod = determinePeriod(val, startTime, endTime)
            setLocalPeriod(autoPeriod)
            updateParent(val, localMinute, autoPeriod)
          }
        }}
        options={hourOptions}
        optionLabel={(val) => `${Number(val)}`}
        disabled={disabled}
        ariaLabel="Hour"
        size="sm"
        placeholder={hourPlaceholder}
        hasError={hasError}
      />
      <NumericDropdownInput
        value={localMinute}
        onChange={(val) => {
          if (val !== minutePlaceholder) {
            setLocalMinute(val)
            updateParent(localHour, val, localPeriod as "AM" | "PM")
          }
        }}
        options={minuteOptions}
        disabled={disabled}
        ariaLabel="Minute"
        size="sm"
        placeholder={minutePlaceholder}
        hasError={hasError}
      />
      <Select 
        value={localPeriod} 
        onValueChange={(val: "AM" | "PM") => {
          setLocalPeriod(val)
          updateParent(localHour, localMinute, val)
        }} 
        disabled={disabled}
      >
        <SelectTrigger className={`w-18 h-8 text-xs ${hasError ? "border-1 border-red-500 focus:ring-red-500 focus:border-red-500" : ""}`}>
          <SelectValue className="text-xs" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((option) => (
            <SelectItem key={`period-${option}`} value={option} className="text-xs">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

