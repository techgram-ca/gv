// /lib/email.ts
import { Resend } from "resend";

const EMAIL_FROM = process.env.EMAIL_FROM!;
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail(
  from:string,
  to: string,
  subject: string,
  html: string,
  text?: string
) {
  return resend.emails.send({
    from,
    to,
    replyTo: EMAIL_FROM,
    subject,
    html,
    text,
  });
}
