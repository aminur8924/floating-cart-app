import { Router } from "express";

const METAFIELD_NAMESPACE = "floating_cart";
const METAFIELD_KEY = "settings";

export function settingsRouter(shopify) {
  const router = Router();

  /* ---------------------------------------
     GET SETTINGS
  --------------------------------------- */

  router.get("/", async (req, res) => {
    try {
      const session =
        res.locals.shopify.session;

      const client =
        new shopify.api.clients.Graphql({
          session,
        });

      const response =
        await client.query({
          data: `{
            shop {
              metafield(
                namespace: "${METAFIELD_NAMESPACE}",
                key: "${METAFIELD_KEY}"
              ) {
                value
              }
            }
          }`,
        });

      const metafield =
        response.body.data.shop.metafield;

      const settings =
        metafield
          ? JSON.parse(
              metafield.value
            )
          : getDefaultSettings();

      res.json(settings);
    } catch (error) {
      console.error(
        "[Settings GET Error]",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Could not load settings",
      });
    }
  });

  /* ---------------------------------------
     SAVE SETTINGS
  --------------------------------------- */

  router.post("/", async (req, res) => {
    try {
      const session =
        res.locals.shopify.session;

      const client =
        new shopify.api.clients.Graphql({
          session,
        });

      /* -----------------------------
         Billing Check
      ----------------------------- */

      let isPro = false;

      try {
        const billingResponse =
          await client.query({
            data: `{
              currentAppInstallation {
                activeSubscriptions {
                  name
                  status
                }
              }
            }`,
          });

        const subscriptions =
          billingResponse.body.data
            .currentAppInstallation
            .activeSubscriptions || [];

        isPro = subscriptions.some(
          (sub) =>
            sub.status === "ACTIVE"
        );
      } catch (e) {
        console.warn(
          "[Billing Check Failed]",
          e
        );
      }

      /* -----------------------------
         Incoming Settings
      ----------------------------- */

      let settings = {
        ...getDefaultSettings(),
        ...req.body,
      };

      /* -----------------------------
         Free Plan Restrictions
      ----------------------------- */

       
 
      /* -----------------------------
         Save Metafield
      ----------------------------- */

      await client.query({
        data: {
          query: `
            mutation metafieldsSet(
              $metafields: [MetafieldsSetInput!]!
            ) {
              metafieldsSet(
                metafields: $metafields
              ) {
                metafields {
                  key
                  value
                }

                userErrors {
                  field
                  message
                }
              }
            }
          `,

          variables: {
            metafields: [
              {
                ownerId: `gid://shopify/Shop/${session.shop}`,

                namespace:
                  METAFIELD_NAMESPACE,

                key:
                  METAFIELD_KEY,

                type: "json",

                value:
                  JSON.stringify(
                    settings
                  ),
              },
            ],
          },
        },
      });

      res.json({
        success: true,
        isPro,
        settings,
      });
    } catch (error) {
      console.error(
        "[Settings SAVE Error]",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Could not save settings",
      });
    }
  });

  return router;
}

/* ---------------------------------------
   DEFAULT SETTINGS
--------------------------------------- */

function getDefaultSettings() {
  return {
    /* Basic */

    buttonSize: "60",

    showBadge: true,

    animation: "bounce",

    position: "bottom-right",

    buttonColor: "#000000",

    badgeColor: "#ff0000",

    autoMatchTheme: true,

    cartDrawer: true,

    /* Design */

    buttonShape: "circle",

    iconType: "default",

    customEmoji: "🛍️",

    customIconUrl: "",

    effect: "none",

    /* Visibility */

    showMobile: true,

    showDesktop: true,

    hidePages: "/checkout",

    /* Drawer */

    freeShippingEnabled: true,

    freeShippingThreshold: 50,

    discountEnabled: true,

    checkoutText: "Checkout",

    /* Analytics */

    clickCount: 0,

    drawerOpenCount: 0,
  };
}