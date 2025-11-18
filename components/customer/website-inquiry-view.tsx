"use client"

import { useState } from "react"
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

/**
 * Website Inquiry View Component
 * 
 * Displays a contact form for customers to submit website/contract inquiries.
 * The form sends emails via Resend API through a Convex action.
 * 
 * Form fields:
 * - Name (required)
 * - Email Address (required)
 * - Company Name (optional)
 * - Subject (required)
 * - Message (required)
 */
export function WebsiteInquiryView() {
  // Convex action for sending emails via Resend
  const sendEmail = useAction(api.email.sendWebsiteInquiry)

  // Form state for all input fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  // Validation state - track which fields have errors
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    subject?: string
    message?: string
  }>({})

  // Loading state - track if email is being sent
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Success state - show message after form submission
  const [isSubmitted, setIsSubmitted] = useState(false)

  /**
   * Validates form fields before submission
   * Required fields: Name, Email, Subject, Message
   * Email must be in valid format
   */
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    // Validate name (required)
    if (!name.trim()) {
      newErrors.name = "Name is required"
    }

    // Validate email (required and must be valid format)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      newErrors.email = "Email address is required"
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address"
    }

    // Validate subject (required)
    if (!subject.trim()) {
      newErrors.subject = "Subject is required"
    }

    // Validate message (required)
    if (!message.trim()) {
      newErrors.message = "Message is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handles form submission
   * Validates the form, then sends email via Resend API through Convex action
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form before proceeding
    if (!validateForm()) {
      return
    }

    // Set loading state
    setIsSubmitting(true)

    try {
      // Call Convex action to send email via Resend
      await sendEmail({
        name: name.trim(),
        email: email.trim(),
        companyName: companyName.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
      })

      // Show success message
      toast.success("Message sent successfully!", {
        description: "Your inquiry has been sent. We'll get back to you soon.",
        duration: 5000,
      })

      // Set submitted state
      setIsSubmitted(true)

      // Reset form after a short delay (allows user to see success message)
      setTimeout(() => {
        setIsSubmitted(false)
        setName("")
        setEmail("")
        setCompanyName("")
        setSubject("")
        setMessage("")
        setErrors({})
      }, 5000)
    } catch (error) {
      // Handle errors - show user-friendly error message
      console.error("Error sending email:", error)
      toast.error("Failed to send message", {
        description: error instanceof Error 
          ? error.message 
          : "An unexpected error occurred. Please try again later.",
        duration: 5000,
      })
    } finally {
      // Reset loading state
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-fluid-2xl font-bold text-foreground">
            Contact the Developer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="text-center py-8">
              <p className="text-fluid-lg text-muted-foreground mb-4">
                Thank you for your inquiry!
              </p>
              <p className="text-sm text-muted-foreground">
                Your message has been sent successfully. We&apos;ll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    // Clear error when user starts typing
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: undefined }))
                    }
                  }}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email Address Field */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="We'll get back to you here"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    // Clear error when user starts typing
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: undefined }))
                    }
                  }}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Company Name Field */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Let us know who you represent"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              {/* Subject Field */}
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="What's this about?"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value)
                    // Clear error when user starts typing
                    if (errors.subject) {
                      setErrors((prev) => ({ ...prev, subject: undefined }))
                    }
                  }}
                  aria-invalid={!!errors.subject}
                  aria-describedby={errors.subject ? "subject-error" : undefined}
                />
                {errors.subject && (
                  <p id="subject-error" className="text-sm text-destructive">
                    {errors.subject}
                  </p>
                )}
              </div>

              {/* Message Field */}
              <div className="space-y-2">
                <Label htmlFor="message">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Send the developer a message"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    // Clear error when user starts typing
                    if (errors.message) {
                      setErrors((prev) => ({ ...prev, message: undefined }))
                    }
                  }}
                  rows={6}
                  className="resize-y"
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "message-error" : undefined}
                />
                {errors.message && (
                  <p id="message-error" className="text-sm text-destructive">
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

