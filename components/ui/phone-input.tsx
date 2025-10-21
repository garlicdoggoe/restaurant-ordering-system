"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { 
  validatePhoneInput, 
  handlePhoneInputChange, 
  getPhonePlaceholder,
  formatPhoneForDisplay 
} from "@/lib/phone-validation"

interface PhoneInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
  showValidation?: boolean
}

/**
 * Reusable phone input component with automatic (+63) prefix handling
 * and real-time validation for Philippine mobile numbers
 */
export function PhoneInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  className,
  error,
  showValidation = true
}: PhoneInputProps) {
  const [validationState, setValidationState] = useState({
    isValid: true,
    error: '',
    normalizedValue: ''
  })

  // Validate input whenever value changes
  useEffect(() => {
    if (showValidation) {
      const validation = validatePhoneInput(value)
      setValidationState(validation)
    }
  }, [value, showValidation])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    handlePhoneInputChange(inputValue, onChange)
  }

  const displayError = error || (!validationState.isValid && validationState.error)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-mono text-sm pointer-events-none">
          +63
        </div>
        <Input
          id={id}
          type="tel"
          value={value}
          onChange={handleInputChange}
          placeholder="(XXX) XXX-XXXX"
          required={required}
          className={cn(
            "font-mono pl-12", // Add left padding to account for prefix
            displayError && "border-red-500 focus:border-red-500",
            className
          )}
          autoComplete="tel"
        />
      </div>
      {displayError && (
        <p className="text-sm text-red-500 mt-1">{displayError}</p>
      )}
    </div>
  )
}

interface GcashInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
  showValidation?: boolean
  onUsePhoneNumber?: () => void
  phoneNumber?: string
}

/**
 * Specialized GCash number input component
 * Includes "Same as phone" button functionality
 */
export function GcashInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  className,
  error,
  showValidation = true,
  onUsePhoneNumber,
  phoneNumber
}: GcashInputProps) {
  const [validationState, setValidationState] = useState({
    isValid: true,
    error: '',
    normalizedValue: ''
  })

  // Validate input whenever value changes
  useEffect(() => {
    if (showValidation) {
      const validation = validatePhoneInput(value)
      setValidationState(validation)
    }
  }, [value, showValidation])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    handlePhoneInputChange(inputValue, onChange)
  }

  const displayError = error || (!validationState.isValid && validationState.error)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-mono text-sm pointer-events-none">
            +63
          </div>
          <Input
            id={id}
            type="tel"
            value={value}
            onChange={handleInputChange}
            placeholder="(XXX) XXX-XXXX"
            required={required}
            className={cn(
              "font-mono pl-12 flex-1", // Add left padding to account for prefix
              displayError && "border-red-500 focus:border-red-500",
              className
            )}
            autoComplete="tel"
          />
        </div>
        {onUsePhoneNumber && phoneNumber && (
          <button
            type="button"
            onClick={onUsePhoneNumber}
            disabled={!phoneNumber.trim()}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Same as phone
          </button>
        )}
      </div>
      {displayError && (
        <p className="text-sm text-red-500 mt-1">{displayError}</p>
      )}
    </div>
  )
}
