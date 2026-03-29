import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const from = process.env.TWILIO_FROM!;

const client = Twilio(accountSid, authToken);

export async function sendSMS(to: string, body: string) {
  return client.messages.create({
    to,
    from,
    body,
  });
}