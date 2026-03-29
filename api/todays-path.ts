// /api/todays-path.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/db";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { token, day } = req.query;

    const tokenRaw = Array.isArray(token) ? token[0] : token;
    const dayRaw = Array.isArray(day) ? day[0] : day;
    let dayNum = parseInt(dayRaw || "", 10);

    if (!tokenRaw) {
      return res.status(400).json({ ok: false, message: "Invalid link" });
    }

    // 1️⃣ Get subscription + content_type of the path
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select(`
        path_id,
        status,
        current_day,
        paths(content_type)
      `)
      .eq("secure_token", tokenRaw)
      .maybeSingle();

    if (subError) {
      return res.status(500).json({ ok: false, message: subError.message });
    }

    if (!sub || sub.status !== "active") {
      return res.json({ ok: false, message: "You are not subscribed or your subscription is inactive." });
    }


    const contentType = (sub.paths as any)?.content_type ?? "progressive";

    // 🔹 Progressive paths
    if (contentType === "progressive") {
      const currentDay = sub.current_day;

      // Use current_day if day is missing or invalid
      if (!Number.isInteger(dayNum) || dayNum < 1) {
        dayNum = currentDay;
      }

      if (dayNum > currentDay) {
        return res.json({ ok: false, message: "Path is not yet available for this day." });
      }

      const { data: content } = await supabase
        .from("path_content")
        .select("gurbani, meaning_pb, meaning_en, gurbani_header")
        .eq("path_id", sub.path_id)
        .eq("day_number", dayNum)
        .single();

      if (!content) {
        return res.json({ ok: false, message: "Content not found" });
      }

      return res.json({
        ok: true,
        ...content,
        canGoNext: dayNum < currentDay,
      });
    }

    // 🔹 Daily paths
    if (contentType === "daily") {
      // Get the last created content for this path
      const { data: lastContent, error: lastContentError } = await supabase
        .from("path_content")
        .select("gurbani, meaning_pb, meaning_en, gurbani_header")
        .eq("path_id", sub.path_id)
        .order("created_at", { ascending: false }) // assuming you have a created_at column
        .limit(1)
        .single();

      if (lastContentError || !lastContent) {
        return res.json({ ok: false, message: "Hukamnama not available yet" });
      }

      return res.json({
        ok: true,
        ...lastContent,
        canGoNext: false, // daily content is same for all users
      });
    }

    // fallback
    return res.json({ ok: false, message: "Invalid path type" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
