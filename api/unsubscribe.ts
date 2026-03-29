// /api/unsubscribe.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: "Missing token" });
  }

  // Find subscription by unsubscribe_token
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("unsubscribe_token", token)
    .single();

  if (error || !sub) {
    return res.status(404).json({ success: false, message: "Subscription not found" });
  }

  if (sub.status === "cancelled") {
    return res.json({ success: true, message: "Already unsubscribed" });
  }

  // Cancel subscription
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", sub.id);

  if (updateError) {
    return res.status(500).json({ success: false, message: "Failed to unsubscribe" });
  }

    // Insert into unsubscribe_logs
  const { error: logError } = await supabase
    .from("unsubscribe_logs")
    .insert({
      subscription_id: sub.id,
      reason: "User unsubscribed", // or get this dynamically from request
    });

  if (logError) {
    console.error("Failed to log unsubscribe:", logError);
  }

  return res.json({ success: true, message: "Unsubscribed successfully" });
}
