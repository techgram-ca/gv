import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../lib/db";
import { sendEmail } from "../../lib/email";
import { sendSMS } from "../../lib/sms";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const isCron = req.headers["x-vercel-cron"] === "1";
  const isDev = process.env.CURRENT_ENV !== "production";
  const DAILY_PAATH_EMAIL = process.env.DAILY_PAATH_EMAIL!;

  if (process.env.CRON_ENABLED !== "true") {
    return res.status(200).json({ ok: false, message: "Cron disabled" });
  }

  if (!isCron && !isDev) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  // 1️⃣ Increment current day safely
  const { error: dayError } = await supabase.rpc("increment_current_day");
  if (dayError) {
    console.error("Failed to increment current day:", dayError);
    return res.status(500).json({ ok: false, message: "Day increment failed" });
  }

  const BASE_URL = process.env.BASE_URL!;
  const DAILY_MESSAGE_SHORT_URL = process.env.DAILY_MESSAGE_SHORT_URL!;
  const UNSUBSCRIBE_SHORT_URL = process.env.UNSUBSCRIBE_SHORT_URL!;

  // 2️⃣ Fetch active subscriptions
  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select(`
      id,
      user_id,
      path_id,
      secure_token,
      current_day,
      unsubscribe_token,
      delivery_method,
      users ( email, phone ),
      paths ( content_type, total_days )
    `)
    .eq("status", "active");

  if (subsError) {
    console.error("Failed to fetch subscriptions:", subsError);
    return res.status(500).json({ ok: false, message: "Failed to fetch subscriptions" });
  }

  if (!subs || subs.length === 0) {
    return res.json({ ok: true, message: "No active subscriptions" });
  }

  // 3️⃣ Process each subscription
  for (const sub of subs) {
    try {
      const user = sub.users as { email?: string; phone?: string };
      const content_type = (sub.paths as any)?.content_type ?? "progressive";
      const totalDays = (sub.paths as any)?.total_days;

      // Prevent overflow beyond total days
      if (content_type === "progressive" && totalDays && sub.current_day > totalDays) {
        console.log("Path completed for subscription:", sub.id);
        continue;
      }

      // Prevent duplicate sends
      const { data: existingLog } = await supabase
        .from("delivery_logs")
        .select("id")
        .eq("subscription_id", sub.id)
        .eq("day_number", sub.current_day)
        .maybeSingle();

      if (existingLog) {
        console.log("Already delivered for subscription/day:", sub.id, sub.current_day);
        continue;
      }

      let link = `${DAILY_MESSAGE_SHORT_URL}/${sub.secure_token}`;
      const unsubscribeLink = `${UNSUBSCRIBE_SHORT_URL}/${sub.unsubscribe_token}`;
      if (content_type === "progressive") {
        link = `${link}/${sub.current_day}`;
      }

      if (!user) continue;

      let deliveryStatus: "success" | "failed" | "skipped" = "success";

      if (sub.delivery_method === "email" && user.email) {

        const { data: pathContent } = await supabase
        .from("path_content")
        .select("id,gurbani_header,gurbani,meaning_pb,meaning_en")
        .eq("path_id", sub.path_id)
        .eq("day_number", sub.current_day)
        .eq("is_active", true)
        .maybeSingle();

        const gurbaniHeaderText = pathContent?.gurbani_header
        ? pathContent.gurbani_header.replace(/<[^>]*>/g, " ")
        : "";

        const emailSubject = `Your today's Gurbani message - ${gurbaniHeaderText}`;

        await sendEmail(
          DAILY_PAATH_EMAIL,
          user.email,
          emailSubject,
          `<!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />
              <title>Today's Gurbani</title>
            </head>
            <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial, sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:20px;">
                <tr>
                  <td align="center">

                    <!-- Read on Web -->
                    <table width="600" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                      <tr>
                        <td align="right" style="font-size:12px;color:#6b7280;">
                          Having trouble reading this email?
                          <a href="${link}" style="color:#111827;text-decoration:underline;">
                            Read on the web
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Main Card -->
                    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

                      <tr>
                        <td align="center" style="padding-bottom:16px;">
                          <h3 style="margin:0;font-size:20px;color:#111827;">
                            Today's Path
                          </h3>
                          <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">
                            ${pathContent?.gurbani_header || ""}
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:12px 0;">
                          <p style="margin:0;font-size:20px;font-style:italic;text-align:center;background:#f3f4f6;padding:16px;border-left:4px solid #111827;border-radius:6px;">
                            ${pathContent?.gurbani || ""}
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding-top:20px;">
                          <h4 style="margin:0 0 8px;font-size:18px;color:#111827;">
                            ਪੰਜਾਬੀ ਵਿੱਚ ਵਿਆਖਿਆ
                          </h4>
                          <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">
                            ${pathContent?.meaning_pb || ""}
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding-top:20px;">
                          <h4 style="margin:0 0 8px;font-size:18px;color:#111827;">
                            Explanation in English
                          </h4>
                          <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">
                            ${pathContent?.meaning_en || ""}
                          </p>
                        </td>
                      </tr>

                    </table>

                    <!-- Footer -->
                    <table width="600" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                      <tr>
                        <td align="center" style="font-size:12px;color:#6b7280;">
                          You’re receiving this because you subscribed to Daily Gurbani.  
                          <br />
                          <a href="${unsubscribeLink}" style="color:#6b7280;text-decoration:underline;">
                            Unsubscribe
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </body>
          </html>`
        );
      } else if (sub.delivery_method === "sms" && user.phone) {
        await sendSMS(user.phone, `Today's Paath:\n${link} \nReply STOP to unsubscribe`);
      } else {
        deliveryStatus = "skipped";
      }

      // Log delivery
      const { error: logError } = await supabase.from("delivery_logs").insert({
        subscription_id: sub.id,
        day_number: sub.current_day,
        delivery_method: sub.delivery_method,
        delivery_status: deliveryStatus
      });

      if (logError) {
        console.error("Failed to log delivery:", logError);
      }

    } catch (err) {
      console.error("Delivery failed for subscription:", sub.id, err);

      await supabase.from("delivery_logs").insert({
        subscription_id: sub.id,
        day_number: sub.current_day,
        delivery_method: sub.delivery_method,
        delivery_status: "failed"
      });
    }
  }

  return res.json({ ok: true });
}
