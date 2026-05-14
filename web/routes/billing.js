import { Router } from "express";

export function billingRouter(shopify) {
  const router = Router();

  // Check current billing status
  router.get("/status", async (req, res) => {
    try {
      const session = res.locals.shopify.session;
      const client = new shopify.api.clients.Graphql({ session });

      const response = await client.query({
        data: `{
          currentAppInstallation {
            activeSubscriptions {
              name
              status
              currentPeriodEnd
            }
          }
        }`,
      });

      const subscriptions =
        response.body.data.currentAppInstallation.activeSubscriptions;
      const isPro = subscriptions.some(
        (sub) => sub.name === "Floating Cart Pro" &&
        (sub.status === "ACTIVE" || sub.status === "PENDING")
      );

      res.json({ isPro, subscriptions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create Pro Plan subscription
  router.post("/subscribe", async (req, res) => {
    try {
      const session = res.locals.shopify.session;
      const confirmationUrl = await shopify.api.billing.request({
        session,
        plan: "Floating Cart Pro",
        isTest: process.env.NODE_ENV !== "production",
      });

      res.json({ confirmationUrl });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel subscription
  router.post("/cancel", async (req, res) => {
    try {
      const session = res.locals.shopify.session;
      await shopify.api.billing.cancel({
        session,
        subscriptionId: req.body.subscriptionId,
        prorate: true,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
