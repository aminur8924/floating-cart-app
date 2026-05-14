import { Router } from "express";

const router = Router();

// App Uninstalled
router.post("/api/webhooks/app-uninstalled", async (req, res) => {
  console.log("App uninstalled:", req.body.domain);
  // Clean up any stored data if needed
  res.sendStatus(200);
});

// GDPR - Customer Data Request
router.post("/api/webhooks/customers-data-request", async (req, res) => {
  // This app does NOT store personal customer data
  // All settings are stored as shop metafields, not customer data
  console.log("Customer data request received - no personal data stored");
  res.sendStatus(200);
});

// GDPR - Customer Data Erasure
router.post("/api/webhooks/customers-redact", async (req, res) => {
  console.log("Customer redact request - no personal data to delete");
  res.sendStatus(200);
});

// GDPR - Shop Data Erasure
router.post("/api/webhooks/shop-redact", async (req, res) => {
  const { shop_domain } = req.body;
  console.log(`Shop redact request for: ${shop_domain}`);
  // Remove any shop-related data from your database
  res.sendStatus(200);
});

export { router as webhooksRouter };
