import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Email Service using Resend
 * 
 * Sends emails via Resend API for website inquiry submissions.
 * Requires RESEND_API_KEY environment variable to be set in Convex dashboard.
 * 
 * To set up:
 * 1. Get your API key from https://resend.com/api-keys
 * 2. In Convex dashboard, go to Settings > Environment Variables
 * 3. Add RESEND_API_KEY with your API key value
 */

interface EmailData {
  name: string;
  email: string;
  companyName?: string;
  subject: string;
  message: string;
}

/**
 * Sends a website inquiry email via Resend
 * 
 * @param emailData - The form data from the inquiry form
 * @returns Success status and message
 */
export const sendWebsiteInquiry = action({
  args: {
    name: v.string(),
    email: v.string(),
    companyName: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Get Resend API key from environment variables
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is not set. " +
        "Please configure it in your Convex dashboard under Settings > Environment Variables."
      );
    }

    // Build email content
    // Format the email body with all inquiry details
    const emailBody = `
Hello,

You have received a new website inquiry from your restaurant ordering system.

Contact Details:
- Name: ${args.name}
- Email: ${args.email}
${args.companyName ? `- Company: ${args.companyName}` : ""}

Subject: ${args.subject}

Message:
${args.message}

---
This inquiry was submitted through the Website Inquiry form.
You can reply directly to ${args.email} to respond.
    `.trim();

    // Prepare email payload for Resend API
    const emailPayload = {
      // FROM: Using verified domain inquiry.blackpeppercampspizza.comzz
      from: "Website Inquiry <noreply@inquiry.blackpeppercampspizza.com>",
      // TO: Recipient email address (the developer's email)
      to: ["selwynguiruela03@gmail.com"],
      replyTo: args.email, // Allow replying directly to the customer
      subject: `Website Inquiry: ${args.subject}`,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2563eb;">New Website Inquiry</h2>
          <p>You have received a new website inquiry from your restaurant ordering system.</p>
          
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0;">Contact Details</h3>
            <p><strong>Name:</strong> ${args.name}</p>
            <p><strong>Email:</strong> <a href="mailto:${args.email}">${args.email}</a></p>
            ${args.companyName ? `<p><strong>Company:</strong> ${args.companyName}</p>` : ""}
          </div>
          
          <div style="margin: 16px 0;">
            <h3>Subject</h3>
            <p>${args.subject}</p>
          </div>
          
          <div style="margin: 16px 0;">
            <h3>Message</h3>
            <p style="white-space: pre-wrap;">${args.message}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This inquiry was submitted through the Website Inquiry form.<br>
            You can reply directly to <a href="mailto:${args.email}">${args.email}</a> to respond.
          </p>
        </div>
      `,
    };

    try {
      // Call Resend API to send email
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to send email: ${response.status} ${response.statusText}. ` +
          `Details: ${JSON.stringify(errorData)}`
        );
      }

      const result = await response.json();

      return {
        success: true,
        message: "Email sent successfully",
        emailId: result.id,
      };
    } catch (error) {
      console.error("Error sending email via Resend:", error);
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

