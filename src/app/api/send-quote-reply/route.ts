// src/app/api/send-quote-reply/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

// 🔧 Usicrash kwenye build kama key haipo
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(req: NextRequest) {
  try {
    if (!resend) {
      console.error("RESEND_API_KEY is missing – email service not configured.");
      return NextResponse.json(
        { error: "Email service not configured." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const {
      toEmail,
      toName,
      operatorName,
      operatorCompany,
      message,
      originalQuoteSummary,
    } = body;

    if (!toEmail || !message) {
      return NextResponse.json(
        { error: "Missing toEmail or message" },
        { status: 400 }
      );
    }

    const subject = `Reply to your Safari Connector enquiry from ${
      operatorCompany || operatorName || "your operator"
    }`;

    const text = `
Hi ${toName || "traveller"},

${operatorName || operatorCompany || "An operator"} has replied to your enquiry on Safari Connector:

"${message}"

Summary of your enquiry:
${originalQuoteSummary || "-"}

You can continue the conversation securely inside your Safari Connector account.

Best regards,
Safari Connector
    `.trim();

    const { error } = await resend.emails.send({
      from: "Safari Connector <no-reply@safariconnector.com>", // make sure this is a verified sender in Resend
      to: [toEmail],
      subject,
      text,
    });

    if (error) {
      console.error("Resend error", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-quote-reply error", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
