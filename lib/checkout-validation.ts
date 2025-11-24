// Validation utilities for checkout dialog

import type { PreorderScheduleDate } from "@/lib/data-context"
import { timeToMinutes, formatTime12h, getTodayIsoDate, DEFAULT_PREORDER_TIME } from "@/lib/time-utils"

export const validatePreOrderDate = (
  date: string,
  restrictionsEnabled: boolean,
  hasConfiguredDates: boolean,
  scheduledDates: PreorderScheduleDate[]
): string => {
  if (!date || !restrictionsEnabled) return ""
  if (!hasConfiguredDates) {
    return "Owner has not published any pre-order dates."
  }
  const allowed = scheduledDates.some((entry) => entry.date === date)
  return allowed ? "" : "Please choose one of the published pre-order dates."
}

export const clampPreOrderDate = (date: string): string => {
  if (!date) return getTodayIsoDate()
  return date
}

export const validatePreOrderTime = (
  time: string,
  date: string,
  restrictionsEnabled: boolean,
  scheduledDates: PreorderScheduleDate[]
): string => {
  if (!restrictionsEnabled) return ""
  if (!time || time === "") {
    return "Please select a preferred time within the window."
  }
  const entry = scheduledDates.find((d) => d.date === date)
  if (!entry) {
    return "Choose an available date first."
  }
  const selectedMinutes = timeToMinutes(time)
  const startMinutes = timeToMinutes(entry.startTime)
  const endMinutes = timeToMinutes(entry.endTime)
  if (selectedMinutes === null || startMinutes === null || endMinutes === null) {
    return "Invalid time format."
  }
  if (selectedMinutes < startMinutes || selectedMinutes > endMinutes) {
    return `Time must be between ${formatTime12h(entry.startTime)} and ${formatTime12h(entry.endTime)}`
  }
  return ""
}

export const clampPreOrderTime = (time: string): string => {
  if (!time) return DEFAULT_PREORDER_TIME
  return time
}

