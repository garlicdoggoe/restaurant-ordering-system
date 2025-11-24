// Time utility functions for checkout dialog and time picker components

export const HOURS_12 = Array.from({ length: 12 }, (_v, idx) => String(idx + 1).padStart(2, "0"))
export const MINUTES_60 = Array.from({ length: 60 }, (_v, idx) => String(idx).padStart(2, "0"))
export const PERIODS: Array<"AM" | "PM"> = ["AM", "PM"]
export const DEFAULT_PREORDER_TIME = "13:00"

export const getTodayIsoDate = () => {
  const now = new Date()
  return now.toISOString().split("T")[0]
}

export const timeToMinutes = (value: string | undefined) => {
  if (!value) return null
  const [hh, mm] = value.split(":").map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null
  return hh * 60 + mm
}

export const to12HourParts = (value?: string) => {
  if (!value) {
    return { hour: "12", minute: "00", period: "PM" as "AM" | "PM" }
  }
  const [hhStr, mm] = value.split(":")
  let hh = Number(hhStr)
  const period = hh >= 12 ? "PM" : "AM"
  hh = hh % 12
  if (hh === 0) hh = 12
  return {
    hour: String(hh).padStart(2, "0"),
    minute: mm ?? "00",
    period,
  }
}

export const to24HourString = (hour: string, minute: string, period: "AM" | "PM") => {
  let hh = Number(hour)
  if (period === "PM" && hh !== 12) {
    hh += 12
  }
  if (period === "AM" && hh === 12) {
    hh = 0
  }
  const minuteClean = minute.padStart(2, "0")
  return `${String(hh).padStart(2, "0")}:${minuteClean}`
}

export const formatTime12h = (value?: string) => {
  if (!value) return ""
  const { hour, minute, period } = to12HourParts(value)
  const minuteClean = minute ?? "00"
  return `${Number(hour)}:${minuteClean} ${period}`
}

export const formatTimeRange12h = (start?: string, end?: string) => {
  if (!start || !end) return ""
  return `${formatTime12h(start)} - ${formatTime12h(end)}`
}

// Helper function to get allowed hours based on schedule window
export const getAllowedHours = (startTime?: string, endTime?: string): string[] => {
  if (!startTime || !endTime) return HOURS_12
  
  const startParts = to12HourParts(startTime)
  const endParts = to12HourParts(endTime)
  
  const startHour = Number(startParts.hour)
  const endHour = Number(endParts.hour)
  const startPeriod = startParts.period
  const endPeriod = endParts.period
  
  // Convert to 24-hour for easier comparison
  const start24 = startPeriod === "PM" && startHour !== 12 ? startHour + 12 : (startPeriod === "AM" && startHour === 12 ? 0 : startHour)
  const end24 = endPeriod === "PM" && endHour !== 12 ? endHour + 12 : (endPeriod === "AM" && endHour === 12 ? 0 : endHour)
  
  const allowed: string[] = []
  
  // Handle case where time window spans midnight
  if (start24 > end24) {
    // Window spans midnight (e.g., 10 PM to 2 AM)
    for (let h = start24; h < 24; h++) {
      const hour12 = h === 0 ? 12 : (h > 12 ? h - 12 : h)
      allowed.push(String(hour12).padStart(2, "0"))
    }
    for (let h = 0; h <= end24; h++) {
      const hour12 = h === 0 ? 12 : (h > 12 ? h - 12 : h)
      const hourStr = String(hour12).padStart(2, "0")
      if (!allowed.includes(hourStr)) {
        allowed.push(hourStr)
      }
    }
  } else {
    // Normal window (e.g., 9 AM to 5 PM)
    for (let h = start24; h <= end24; h++) {
      const hour12 = h === 0 ? 12 : (h > 12 ? h - 12 : h)
      allowed.push(String(hour12).padStart(2, "0"))
    }
  }
  
  // Remove duplicates and sort
  return [...new Set(allowed)].sort((a, b) => Number(a) - Number(b))
}

// Helper function to get allowed minutes based on schedule window and selected hour
export const getAllowedMinutes = (startTime?: string, endTime?: string, selectedHour?: string, selectedPeriod?: "AM" | "PM"): string[] => {
  if (!startTime || !endTime) return MINUTES_60
  if (!selectedHour || selectedHour === "HH" || !selectedPeriod) return MINUTES_60
  
  const startParts = to12HourParts(startTime)
  const endParts = to12HourParts(endTime)
  
  const startHour = Number(startParts.hour)
  const endHour = Number(endParts.hour)
  const startMinute = Number(startParts.minute)
  const endMinute = Number(endParts.minute)
  const startPeriod = startParts.period
  const endPeriod = endParts.period
  
  const selectedHourNum = Number(selectedHour)
  
  // Convert to 24-hour for easier comparison
  const start24Hour = startPeriod === "PM" && startHour !== 12 ? startHour + 12 : (startPeriod === "AM" && startHour === 12 ? 0 : startHour)
  const end24Hour = endPeriod === "PM" && endHour !== 12 ? endHour + 12 : (endPeriod === "AM" && endHour === 12 ? 0 : endHour)
  const selected24Hour = selectedPeriod === "PM" && selectedHourNum !== 12 ? selectedHourNum + 12 : (selectedPeriod === "AM" && selectedHourNum === 12 ? 0 : selectedHourNum)
  
  const startTotalMinutes = start24Hour * 60 + startMinute
  const endTotalMinutes = end24Hour * 60 + endMinute
  
  const allowed: number[] = []
  
  // Handle case where time window spans midnight
  if (startTotalMinutes > endTotalMinutes) {
    // Window spans midnight
    if (selected24Hour >= start24Hour || selected24Hour <= end24Hour) {
      if (selected24Hour === start24Hour) {
        // At start hour, only allow minutes >= start minute
        for (let m = startMinute; m < 60; m++) {
          allowed.push(m)
        }
      } else if (selected24Hour === end24Hour) {
        // At end hour, only allow minutes <= end minute
        for (let m = 0; m <= endMinute; m++) {
          allowed.push(m)
        }
      } else if (selected24Hour > start24Hour || selected24Hour < end24Hour) {
        // Between start and end, allow all minutes
        for (let m = 0; m < 60; m++) {
          allowed.push(m)
        }
      }
    }
  } else {
    // Normal window
    if (selected24Hour >= start24Hour && selected24Hour <= end24Hour) {
      if (selected24Hour === start24Hour && selected24Hour === end24Hour) {
        // Same hour for start and end, only allow minutes in range
        for (let m = startMinute; m <= endMinute; m++) {
          allowed.push(m)
        }
      } else if (selected24Hour === start24Hour) {
        // At start hour, only allow minutes >= start minute
        for (let m = startMinute; m < 60; m++) {
          allowed.push(m)
        }
      } else if (selected24Hour === end24Hour) {
        // At end hour, only allow minutes <= end minute
        for (let m = 0; m <= endMinute; m++) {
          allowed.push(m)
        }
      } else {
        // Between start and end, allow all minutes
        for (let m = 0; m < 60; m++) {
          allowed.push(m)
        }
      }
    }
  }
  
  return allowed.map(m => String(m).padStart(2, "0"))
}

// Helper function to determine the appropriate period (AM/PM) based on selected hour and schedule window
export const determinePeriod = (hour: string, startTime?: string, endTime?: string): "AM" | "PM" => {
  if (!startTime || !endTime || hour === "HH" || hour === "") {
    return "PM" // Default to PM if no schedule info
  }
  
  const hourNum = Number(hour)
  const startParts = to12HourParts(startTime)
  const endParts = to12HourParts(endTime)
  
  const startHour = Number(startParts.hour)
  const endHour = Number(endParts.hour)
  const startPeriod = startParts.period
  const endPeriod = endParts.period
  
  // Convert to 24-hour for easier comparison
  const start24 = startPeriod === "PM" && startHour !== 12 ? startHour + 12 : (startPeriod === "AM" && startHour === 12 ? 0 : startHour)
  const end24 = endPeriod === "PM" && endHour !== 12 ? endHour + 12 : (endPeriod === "AM" && endHour === 12 ? 0 : endHour)
  
  // Convert selected hour to 24-hour format for both AM and PM to see which fits in the window
  const hourAM24 = hourNum === 12 ? 0 : hourNum
  const hourPM24 = hourNum === 12 ? 12 : hourNum + 12
  
  // Handle case where time window spans midnight
  if (start24 > end24) {
    // Window spans midnight (e.g., 10 PM to 2 AM)
    // Check if hour in AM fits (0-2 AM range)
    if (hourAM24 >= 0 && hourAM24 <= end24) {
      return "AM"
    }
    // Check if hour in PM fits (10 PM - 11 PM range)
    if (hourPM24 >= start24 && hourPM24 < 24) {
      return "PM"
    }
    // Default to PM if ambiguous
    return "PM"
  } else {
    // Normal window (e.g., 9 AM to 5 PM)
    // Check if hour in AM fits
    if (hourAM24 >= start24 && hourAM24 <= end24) {
      return "AM"
    }
    // Check if hour in PM fits
    if (hourPM24 >= start24 && hourPM24 <= end24) {
      return "PM"
    }
    // If hour appears in both AM and PM ranges, prefer the one closer to start
    const distAM = Math.abs(hourAM24 - start24)
    const distPM = Math.abs(hourPM24 - start24)
    return distAM < distPM ? "AM" : "PM"
  }
}

