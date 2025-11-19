"use client"

import { useEffect, useRef } from "react"
import { useNextStep } from "nextstepjs"
import { customerOnboardingSteps } from "@/lib/onboarding-steps"
import type { CustomerView } from "./customer-interface"

interface OnboardingHelperProps {
  currentView: CustomerView
  onViewChange: (view: CustomerView) => void
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
}

/**
 * OnboardingHelper component
 * Manages sidebar visibility and navigation during the onboarding tour
 * to ensure components are visible when being highlighted
 */
export function OnboardingHelper({
  currentView,
  onViewChange,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isCartOpen,
  setIsCartOpen,
}: OnboardingHelperProps) {
  const { isNextStepVisible, currentStep } = useNextStep()
  const prevIsActiveRef = useRef(false)
  const hasSwitchedToMenuRef = useRef(false)
  const sidebarOpenedForStep8Ref = useRef(false)

  // Proactively switch to Menu view when tour starts
  // This ensures Menu view is active before the tour tries to highlight Menu elements
  useEffect(() => {
    // Detect when tour becomes active (isNextStepVisible changes from false to true)
    const tourJustStarted = isNextStepVisible && !prevIsActiveRef.current
    
    if (tourJustStarted) {
      // Reset the switch flag when tour starts
      hasSwitchedToMenuRef.current = false
      
      // If we're not on Menu view, switch to it immediately
      // The first few steps (after Welcome) target Menu view elements
      if (currentView !== "menu") {
        // Switch immediately - don't wait
        onViewChange("menu")
        // Close mobile menu and cart drawers when switching to Menu view
        // Menu view should be displayed without overlays
        setIsMobileMenuOpen(false)
        setIsCartOpen(false)
        hasSwitchedToMenuRef.current = true
      }
    }
    
    // Also check continuously: if tour is active and we're not on Menu view, switch to it
    // This handles edge cases where the initial switch didn't work or was delayed
    if (isNextStepVisible && currentView !== "menu" && !hasSwitchedToMenuRef.current) {
      // Switch to Menu view - this is a fallback for cases where the initial switch didn't work
      onViewChange("menu")
      // Close mobile menu and cart drawers when switching to Menu view
      setIsMobileMenuOpen(false)
      setIsCartOpen(false)
      hasSwitchedToMenuRef.current = true
    }
    
    // Reset switch flag when tour ends
    if (!isNextStepVisible && prevIsActiveRef.current) {
      hasSwitchedToMenuRef.current = false
    }
    
    // Update ref to track previous state
    prevIsActiveRef.current = isNextStepVisible
  }, [isNextStepVisible, currentView, onViewChange])

  useEffect(() => {
    if (!isNextStepVisible) return

    // Poll to check which onboarding element is currently visible/highlighted
    // NextStep highlights elements, so we check for visible elements with our IDs
    const checkCurrentStep = () => {
      // If tour is active and we're still not on Menu view, force switch
      // This is a fallback in case the initial switch didn't work
      if (isNextStepVisible && currentView !== "menu" && !hasSwitchedToMenuRef.current) {
        onViewChange("menu")
        // Close mobile menu and cart drawers when switching to Menu view
        setIsMobileMenuOpen(false)
        setIsCartOpen(false)
        hasSwitchedToMenuRef.current = true
        return
      }
      
      // Step 8 (index 7) is "Navigation Sidebar" - automatically open sidebar on mobile
      // This happens after step 7 points to the burger menu button
      if (currentStep === 7 && window.innerWidth < 1024 && !isMobileMenuOpen && !sidebarOpenedForStep8Ref.current) {
        // Open sidebar automatically for step 8
        setIsMobileMenuOpen(true)
        sidebarOpenedForStep8Ref.current = true
      }
      
      // Reset the flag when we move away from step 8
      if (currentStep !== 7) {
        sidebarOpenedForStep8Ref.current = false
      }
      
      // Prioritize view elements (more specific) over nav elements
      const viewElements = document.querySelectorAll('[id^="onboarding-view-"]')
      const navElements = document.querySelectorAll('[id^="onboarding-nav-"]')
      const otherElements = document.querySelectorAll('[id^="onboarding-"]:not([id^="onboarding-view-"]):not([id^="onboarding-nav-"])')
      
      // Check view elements first (they require navigation)
      for (const element of viewElements) {
        const elementId = element.id
        if (!elementId) continue

        const rect = element.getBoundingClientRect()
        const isVisible = rect.width > 0 && rect.height > 0 && 
          window.getComputedStyle(element).display !== 'none' &&
          window.getComputedStyle(element).visibility !== 'hidden'

        if (!isVisible) continue

        // Handle navigation to different views
        if (elementId.includes("onboarding-view-preorders") && currentView !== "preorders") {
          onViewChange("preorders")
          if (window.innerWidth < 1024) setIsMobileMenuOpen(true)
          return
        } else if (elementId.includes("onboarding-view-activeorders") && currentView !== "activeorders") {
          onViewChange("activeorders")
          if (window.innerWidth < 1024) setIsMobileMenuOpen(true)
          return
        } else if (elementId.includes("onboarding-view-orders") && currentView !== "orders") {
          onViewChange("orders")
          if (window.innerWidth < 1024) setIsMobileMenuOpen(true)
          return
        } else if (elementId.includes("onboarding-view-inbox") && currentView !== "inbox") {
          onViewChange("inbox")
          if (window.innerWidth < 1024) setIsMobileMenuOpen(true)
          return
        } else if (elementId.includes("onboarding-view-settings") && currentView !== "profile") {
          onViewChange("profile")
          if (window.innerWidth < 1024) setIsMobileMenuOpen(true)
          return
        } else if (elementId.includes("onboarding-view-inquiry") && currentView !== "inquiry") {
          onViewChange("inquiry")
          if (window.innerWidth < 1024) setIsMobileMenuOpen(true)
          return
        } else if (elementId.includes("onboarding-view-menu") && currentView !== "menu") {
          onViewChange("menu")
          // Close mobile menu and cart drawers when switching to Menu view
          setIsMobileMenuOpen(false)
          setIsCartOpen(false)
          return
        }
      }

      // Check nav elements (for sidebar visibility)
      // Only open sidebar on mobile if we're NOT on Menu view
      // Menu view should remain unobstructed
      if (currentView !== "menu") {
        for (const element of navElements) {
          const elementId = element.id
          if (!elementId) continue

          const rect = element.getBoundingClientRect()
          const isVisible = rect.width > 0 && rect.height > 0

          if (isVisible && window.innerWidth < 1024 && !isMobileMenuOpen) {
            setIsMobileMenuOpen(true)
            break
          }
        }
      }

      // Check other elements (cart, etc.)
      // Note: Sidebar opening is handled separately above based on currentStep === 7 (step 8)
      // Other drawers should only open if we're NOT on Menu view
      for (const element of otherElements) {
        const elementId = element.id
        if (!elementId) continue

        const rect = element.getBoundingClientRect()
        const isVisible = rect.width > 0 && rect.height > 0 &&
          window.getComputedStyle(element).display !== 'none' &&
          window.getComputedStyle(element).visibility !== 'hidden'

        if (!isVisible) continue

        // Skip sidebar element - it's handled separately above based on step number
        if (elementId.includes("onboarding-sidebar-menu")) {
          continue
        }
        
        if (elementId.includes("onboarding-cart-mobile") && window.innerWidth < 1024 && !isCartOpen && currentView !== "menu") {
          // Cart should only open if we're NOT on Menu view
          setIsCartOpen(true)
        }
      }
    }

    // Check periodically which step element is visible
    const interval = setInterval(checkCurrentStep, 300)

    return () => {
      clearInterval(interval)
    }
  }, [isNextStepVisible, currentView, onViewChange, isMobileMenuOpen, setIsMobileMenuOpen, isCartOpen, setIsCartOpen, currentStep])

  // This component doesn't render anything
  return null
}

