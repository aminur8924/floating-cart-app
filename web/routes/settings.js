import { Router } from "express";

const METAFIELD_NAMESPACE = "floating_cart";
const METAFIELD_KEY = "settings";

export function settingsRouter(shopify) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const session = res.locals.shopify.session;
      const client = new shopify.api.clients.Graphql({ session });

      const response = await client.query({
        data: `{
          shop {
            id
            metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
              value
            }
          }
        }`,
      });

      const metafield = response.body.data.shop.metafield;

      const settings = metafield?.value
        ? JSON.parse(metafield.value)
        : getDefaultSettings();

      res.json({
        ...getDefaultSettings(),
        ...settings,
        isPro: true,
      });
    } catch (error) {
      console.error("[Settings GET Error]", error);
      res.status(500).json({
        error: error.message || "Could not load settings",
      });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const session = res.locals.shopify.session;
      const client = new shopify.api.clients.Graphql({ session });

      const shopResponse = await client.query({
        data: `{
          shop {
            id
          }
        }`,
      });

      const shopId = shopResponse.body.data.shop.id;

      const settings = {
        ...getDefaultSettings(),
        ...req.body,
      };

      const saveResponse = await client.query({
        data: {
          query: `
            mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
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
                ownerId: shopId,
                namespace: METAFIELD_NAMESPACE,
                key: METAFIELD_KEY,
                type: "json",
                value: JSON.stringify(settings),
              },
            ],
          },
        },
      });

      const errors = saveResponse.body.data.metafieldsSet.userErrors;

      if (errors && errors.length > 0) {
        return res.status(400).json({
          error: errors.map((e) => e.message).join(", "),
        });
      }

      res.json({
        success: true,
        isPro: true,
        settings,
      });
    } catch (error) {
      console.error("[Settings SAVE Error]", error);
      res.status(500).json({
        error: error.message || "Could not save settings",
      });
    }
  });

  return router;
}

function getDefaultSettings() {
  return {
    buttonSize: "60",
    showBadge: true,
    animation: "bounce",
    position: "bottom-right",
    buttonColor: "#000000",
    badgeColor: "#ff0000",
    autoMatchTheme: true,
    cartDrawer: true,

    buttonShape: "circle",
    iconType: "default",
    customEmoji: "🛍️",
    customIconUrl: "",
    effect: "none",

    showMobile: true,
    showDesktop: true,
    hidePages: "/checkout",

    freeShippingEnabled: true,
    freeShippingThreshold: 50,
    discountEnabled: true,
    checkoutText: "Checkout",

    clickCount: 0,
    drawerOpenCount: 0,
  };
}