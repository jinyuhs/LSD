// Netlify Function: builds a Stripe Checkout Session on the fly from the
// cart contents sent by script.js. Runs server-side, so the Stripe secret
// key stays private (set as an environment variable in Netlify, never in
// this repo).
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { cart } = JSON.parse(event.body || "{}");

    if (!Array.isArray(cart) || cart.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Cart is empty" }) };
    }

    // Build one Stripe line item per cart line (one per size).
    // Prices are defined here in cents, not trusted from the browser,
    // so someone can't tamper with the price client-side.
    const PRICE_USD = 145.0;
    const PRODUCT_NAME = "LSD-101 RUNNER";

    const line_items = cart.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${PRODUCT_NAME} — Size ${item.size}`,
        },
        unit_amount: Math.round(PRICE_USD * 100),
      },
      quantity: Math.max(1, Math.min(10, Number(item.qty) || 1)),
    }));

    const siteUrl = process.env.URL || "https://lsdinc.netlify.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${siteUrl}/?checkout=success`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
      shipping_address_collection: {
        allowed_countries: ["US", "AE", "GB", "CA", "AU"],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
