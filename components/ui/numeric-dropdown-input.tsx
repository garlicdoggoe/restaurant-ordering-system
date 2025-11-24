"use client"

import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export interface NumericDropdownInputProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  optionLabel?: (value: string) => string
  disabled?: boolean
  ariaLabel: string
  size?: "sm" | "md"
  placeholder?: string
  hasError?: boolean
}

export function NumericDropdownInput({
  value,
  onChange,
  options,
  optionLabel,
  disabled,
  ariaLabel,
  size = "md",
  placeholder,
  hasError = false,
}: NumericDropdownInputProps) {
  const [internal, setInternal] = useState(value)

  useEffect(() => {
    setInternal(value)
  }, [value])

  const sanitize = (input: string) => input.replace(/[^0-9]/g, "").slice(0, 2)

  const commitValue = (next: string) => {
    // If placeholder is set and value is empty/placeholder, don't commit
    if (placeholder && (!next || next === placeholder)) {
      setInternal(placeholder)
      return
    }
    const fallback = options[0] ?? "00"
    const normalized = next ? sanitize(next).padStart(2, "0") : fallback
    setInternal(normalized)
    onChange(normalized)
  }
  
  // Check if current value is a placeholder
  const isPlaceholder = placeholder && (value === placeholder || !value || value === "")

  const inputClasses =
    size === "sm"
      ? `w-16 h-8 text-center text-xs px-2 ${hasError ? "border-1 border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500" : ""}`
      : `w-20 text-center ${hasError ? "border-1 border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500" : ""}`

  const triggerClasses =
    size === "sm"
      ? "h-8 w-8"
      : "w-10 h-10"

  const iconClasses = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  const menuClasses = size === "sm" ? "text-xs" : ""

  return (
    <div className="flex items-center gap-1">
      <Input
        value={isPlaceholder ? placeholder : internal}
        onChange={(e) => {
          const sanitized = sanitize(e.target.value)
          if (sanitized) {
            setInternal(sanitized)
          } else if (placeholder) {
            setInternal(placeholder)
          } else {
            setInternal("")
          }
        }}
        onBlur={() => commitValue(internal)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitValue((e.currentTarget as HTMLInputElement).value)
          }
        }}
        disabled={disabled}
        inputMode="numeric"
        aria-label={ariaLabel}
        className={inputClasses}
        placeholder={placeholder}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label={`${ariaLabel} options`}
            className={`${triggerClasses} ${hasError ? "border-1 border-red-500" : ""}`}
          >
            <ChevronDown className={iconClasses} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-60 overflow-y-auto p-0 text-xs">
          {options.map((option) => (
            <DropdownMenuItem
              key={`${ariaLabel}-${option}`}
              onSelect={() => commitValue(option)}
              className={menuClasses}
            >
              {optionLabel ? optionLabel(option) : option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

