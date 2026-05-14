import "dotenv/config";
import express from "express";
import { shopifyApp } from "@shopify/shopify-app-express";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import { billingRouter } from "./routes/billing.js";
import { settingsRouter } from "./routes/settings.js";
import { webhooksRouter } from "./routes/webhooks.js";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL,
  sessionStorage: new SQLiteSessionStorage("./database.sqlite"),
  billing: {
    "Floating Cart Pro": {
      amount: 1.99,
      currencyCode: "USD",
      interval: "EVERY_30_DAYS",
      trialDays: 3,
    },
  },
});

const app = express();
app.use(express.json());

// Shopify Auth
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);

// Webhooks
app.post("/api/webhooks/*", webhooksRouter);

// Authenticated routes
app.use("/api/*", shopify.validateAuthenticatedSession());
app.use("/api/billing", billingRouter(shopify));
app.use("/api/settings", settingsRouter(shopify));

// Serve frontend
app.use(shopify.cspHeaders());
app.use(express.static("../frontend/dist"));

app.listen(PORT, () => {
  console.log(`🚀 Floating Cart App running on port ${PORT}`);
});

export { shopify };
