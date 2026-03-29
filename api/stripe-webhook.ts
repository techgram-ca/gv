import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { supabase } from "../lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const config = {
  api: { bodyParser: false }, // Stripe requires raw body
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  // Read raw body
  const buf = await new Promise<Buffer>((resolve) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).send("Missing Stripe signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Only handle checkout session completed events
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const type = session.metadata?.type;

    try {

        const { error } = await supabase
          .from("payments")
          .update({
            status: "succeeded",
            stripe_payment_intent_id: session.payment_intent,
            currency : session.currency,
            amount_cents : session.amount_total,
          })
          .eq("stripe_session_id", session.id);

        if (error) {
          console.error("Supabase donation update failed:", error.message);
          return res.status(500).send("Database update failed");
        }

      if (type === "subscription") {
        // ---- Path Subscriptions ----
        const userId = session.metadata?.user_id;
        const pathId = session.metadata?.path_id;

        if (!userId || !pathId) {
          console.error("Missing subscription metadata");
          return res.status(400).send("Missing subscription metadata");
        }

        // Fetch existing subscription
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .eq("path_id", pathId)
          .single();

        if (!subscription) {
          console.error("Subscription not found");
          return res.status(400).send("Subscription not found");
        }

        // Mark subscription as paid and active
        const { error: subUpdateError } = await supabase
          .from("subscriptions")
          .update({ is_paid: true, status: "active" })
          .eq("id", subscription.id);

        if (subUpdateError) {
          console.error("Failed to update subscription:", subUpdateError.message);
          return res.status(500).send("Failed to update subscription");
        }
      } else {
        console.warn("Unknown checkout session type:", type);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Error handling checkout session:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    // Other events can be ignored
    res.json({ received: true });
  }
}
