// /api/signup.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/db";
import { sendEmail } from "../lib/email";
import { sendSMS } from "../lib/sms";
import crypto from "crypto";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const BASE_URL = process.env.BASE_URL!;
const SIGN_UP_EMAIL = process.env.SIGN_UP_EMAIL!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { path_id, name, email, phone, delivery_method, subscription_type } = req.body;

  if (!path_id || !name) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  if (!email && !phone) {
    return res.status(400).json({ success: false, message: "Email or phone required" });
  }

  // 1️⃣ Create or fetch user
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      { name, email, phone },
      { onConflict: email ? "email" : "phone" }
    )
    .select()
    .single();

  if (userError || !user) {
    return res.status(500).json({ success: false, message: "User creation failed" });
  }

  // 2️⃣ Create subscription if not exists
  const secureToken = crypto.randomUUID();
  const unsubscribeToken = crypto.randomUUID();

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("path_id", path_id)
    .single();

    if (existingSub && existingSub.status === "active") {
      return res.status(200).json({ success: false, message: "You’re already subscribed to this Paath. If you’re not seeing any emails, please check your spam folder." });
    }

  let subscriptionId = "";

  if (!existingSub) {
    const { data: subscriptionData, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        path_id,
        delivery_method,
        status: "active",
        current_day: 0,
        secure_token: secureToken,
        unsubscribe_token: unsubscribeToken,
        is_paid: false
      })
      .select()
      .single();

    if (subError) {
      return res.status(400).json({ success: false, message: "Subscription creation failed" });
    }

    subscriptionId = subscriptionData?.id;
  }

    // 3️⃣ Notify Users
    const { data: pathContent, error: pathError } = await supabase
      .from("paths")
      .select("thank_you_sms_text, thank_you_email_subject, thank_you_email_body_html")
      .eq("id", path_id)
      .single();

    if (pathError) {
      console.error("Failed to fetch email content", pathError);
    }
    if (delivery_method === "email" && email) {
      await sendEmail(
        SIGN_UP_EMAIL,
        email,
          pathContent?.thank_you_email_subject || "Thank you for subscribing 🙏",
          pathContent?.thank_you_email_body_html || "<p>Your daily Gurbani will start tomorrow.</p>"
          );
      }
    if (delivery_method === "sms" && phone) {
      const smsText = pathContent?.thank_you_sms_text  || "Thank you for subscribing 🙏 You'll start receiving the daily Paath from tomorrow.";
      await sendSMS(phone, smsText);
    }

  // 4️⃣ Handle free subscription
  if (subscription_type === "free") {
    return res.json({
      success: true,
      message: "Subscription created. Reflections will start from tomorrow."
    });
  }

  // 5️⃣ Handle paid subscription (support / donation)
  if (subscription_type === "paid") {
    // Fetch path to get Stripe price IDs and type
    const { data: path } = await supabase
      .from("paths")
      .select("stripe_price_id, payment_type")
      .eq("id", path_id)
      .single();

    if (!path) {
      return res.status(500).json({ success: false, message: "Path not found" });
    }

    // Pick correct price ID based on path's payment_type
    let priceId = path.stripe_price_id;

    if (!priceId) {
      return res.status(500).json({ success: false, message: "Stripe price not configured for this path" });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: path.payment_type === "recurring" ? "subscription" : "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        }
      ],
      success_url: `${BASE_URL}/thank-you?p=true`,
      cancel_url: `${BASE_URL}/cancel`,
      metadata: {
        type: "subscription",
        user_id: user.id,
        path_id,
        subscription_id: String(subscriptionId),
        payment_type: path.payment_type, 
      },
    });

    // Insert payment record
        const { error: paymentError } = await supabase.from("payments").insert({
          user_id: user.id,
          path_id: path_id,
          subscription_id: subscriptionId,
          stripe_session_id: session.id,
          status: "pending",
          payment_type: session.mode === "subscription" ? "recurring-subscription" : "fixed-subscription",
        });
        
        if (paymentError) {
          console.error("Failed to save subscription payment:", paymentError.message);
          return res.status(500).send("Failed to save payment");
        }

    return res.json({
      success: true,
      checkout_url: session.url
    });
  }

  res.status(400).json({ success: false, message: "Invalid payment_type" });
}
