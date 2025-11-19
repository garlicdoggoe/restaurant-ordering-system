"use client"

import { useEffect, useRef } from "react"
import { useNextStep } from "nextstepjs"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useData } from "@/lib/data-context"

/**
 * OnboardingTrigger component
 * Automatically starts the onboarding tour for new customers
 * and handles tour completion tracking
 */
export function OnboardingTrigger() {
  const { currentUser } = useData()
  const { startNextStep, isNextStepVisible } = useNextStep()
  const markOnboardingCompleted = useMutation(api.users.markOnboardingCompleted)
  const hasStartedRef = useRef(false)
  const completionMarkedRef = useRef(false)

  // Check if user needs onboarding
  // The Convex flag flips to true after the user completes/skips onboarding, so this only runs once per signup.
  const needsOnboarding = 
    currentUser?.role === "customer" && 
    currentUser.onboardingCompleted === false

  // Auto-start tour for new customers
  useEffect(() => {
    // Only start if:
    // 1. User is loaded and is a customer
    // 2. Onboarding hasn't been completed
    // 3. We haven't already started the tour
    // 4. User profile is complete (so they can actually use the interface)
    if (
      needsOnboarding &&
      !hasStartedRef.current &&
      currentUser?.profileComplete &&
      !isNextStepVisible
    ) {
      // Small delay to ensure DOM is ready and all elements are rendered
      const timer = setTimeout(() => {
        try {
          startNextStep("customerOnboarding")
          hasStartedRef.current = true
        } catch (error) {
          console.error("Failed to start onboarding tour:", error)
        }
      }, 1000) // Increased delay to ensure mobile/desktop elements are rendered

      return () => clearTimeout(timer)
    }
  }, [needsOnboarding, currentUser?.profileComplete, startNextStep, isNextStepVisible])

  // Track tour completion - mark as completed when tour ends
  useEffect(() => {
    // If tour was active but is no longer active, and we haven't marked it as completed
    if (
      hasStartedRef.current &&
      !isNextStepVisible &&
      !completionMarkedRef.current &&
      needsOnboarding
    ) {
      // Mark onboarding as completed
      markOnboardingCompleted().catch((error) => {
        console.error("Failed to mark onboarding as completed:", error)
      })
      completionMarkedRef.current = true
    }
  }, [isNextStepVisible, needsOnboarding, markOnboardingCompleted])

  // This component doesn't render anything
  return null
}

/**
 * Hook to manually start onboarding tour
 * Used by settings page to restart the tour
 */
export function useStartOnboarding() {
  const { startNextStep } = useNextStep()
  const resetOnboarding = useMutation(api.users.resetOnboarding)

  const startOnboarding = async () => {
    try {
      // Reset the onboarding flag
      await resetOnboarding()
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        startNextStep("customerOnboarding")
      }, 300)
    } catch (error) {
      console.error("Failed to restart onboarding:", error)
      throw error
    }
  }

  return startOnboarding
}

/**
 * Hook to mark onboarding as completed
 * Called when user completes the tour or skips it
 */
export function useCompleteOnboarding() {
  const markOnboardingCompleted = useMutation(api.users.markOnboardingCompleted)
  const { closeNextStep } = useNextStep()

  const completeOnboarding = async () => {
    try {
      await markOnboardingCompleted()
      closeNextStep()
    } catch (error) {
      console.error("Failed to mark onboarding as completed:", error)
      throw error
    }
  }

  return completeOnboarding
}

