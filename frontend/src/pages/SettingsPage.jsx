import React, { useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Banner,
  Badge,
  BlockStack,
  InlineStack,
  Text,
  Divider,
  Box,
  Spinner,
} from "@shopify/polaris";

const defaultSettings = {
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
};

export default function SettingsPage() {
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    let token = "";

    try {
      if (window.shopify && window.shopify.idToken) {
        token = await window.shopify.idToken();
      }
    } catch (e) {
      console.warn("Could not get Shopify token", e);
    }

    return window.fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  const [settings, setSettings] = useState(defaultSettings);
  const [isPro, setIsPro] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const [billingRes, settingsRes] = await Promise.all([
          authenticatedFetch("/api/billing/status"),
          authenticatedFetch("/api/settings"),
        ]);

        const billingText = await billingRes.text();
        const settingsText = await settingsRes.text();

        const billing = billingText ? JSON.parse(billingText) : {};
        const savedSettings = settingsText ? JSON.parse(settingsText) : {};

        setIsPro(Boolean(billing.isPro));
        setSettings((prev) => ({
          ...prev,
          ...savedSettings,
        }));
      } catch (err) {
        console.error(err);
        setError("Could not load settings. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [authenticatedFetch]);

  const update = useCallback(
    (key) => (value) => {
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const updateNumber = useCallback(
    (key) => (value) => {
      setSettings((prev) => ({
        ...prev,
        [key]: Number(value),
      }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      const res = await authenticatedFetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(data.error || "Save failed");
      }

      setSettings((prev) => ({
        ...prev,
        ...(data.settings || {}),
      }));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }, [authenticatedFetch, settings]);

  const handleUpgrade = useCallback(async () => {
    try {
      const res = await authenticatedFetch("/api/billing/subscribe", {
        method: "POST",
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (data.confirmationUrl) {
        window.top.location.href = data.confirmationUrl;
      }
    } catch (err) {
      console.error(err);
      setError("Could not start billing.");
    }
  }, [authenticatedFetch]);

  if (loading) {
    return (
      <Page title="Floating Cart Settings">
        <Card>
          <Box padding="500">
            <InlineStack gap="300" blockAlign="center">
              <Spinner size="small" />
              <Text>Loading settings...</Text>
            </InlineStack>
          </Box>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Floating Cart Button"
      subtitle="Customize your floating cart, cart drawer, discount field and free shipping bar"
      primaryAction={{
        content: "Save settings",
        onAction: handleSave,
        loading: saving,
      }}
    >
      <BlockStack gap="500">
        {!isPro && (
          <Banner
            title="Pro features are locked"
            tone="info"
            action={{
              content: "Start free trial",
              onAction: handleUpgrade,
            }}
          >
            <p>
              Upgrade to unlock custom icons, colors, drawer tools, discount
              field, free shipping progress and advanced visibility controls.
            </p>
          </Banner>
        )}

        {saved && (
          <Banner title="Settings saved successfully!" tone="success" />
        )}

        {error && (
          <Banner title="Something went wrong" tone="critical">
            <p>{error}</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd">Basic Button Settings</Text>
                  <Badge tone="success">Free</Badge>
                </InlineStack>

                <Divider />

                <FormLayout>
                  <TextField
                    label="Button size"
                    type="number"
                    suffix="px"
                    min="40"
                    max="90"
                    value={String(settings.buttonSize)}
                    onChange={update("buttonSize")}
                  />

                  <Checkbox
                    label="Show cart item badge"
                    checked={Boolean(settings.showBadge)}
                    onChange={update("showBadge")}
                  />

                  <Select
                    label="Animation"
                    options={[
                      { label: "Bounce", value: "bounce" },
                      { label: "None", value: "none" },
                    ]}
                    value={settings.animation}
                    onChange={update("animation")}
                  />

                  <Checkbox
                    label="Enable cart drawer"
                    checked={Boolean(settings.cartDrawer)}
                    onChange={update("cartDrawer")}
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd">Design Settings</Text>
                  <Badge tone={isPro ? "success" : "warning"}>
                    {isPro ? "Pro active" : "Pro only"}
                  </Badge>
                </InlineStack>

                <Divider />

                <FormLayout>
                  <Select
                    label="Button shape"
                    disabled={!isPro}
                    options={[
                      { label: "Circle", value: "circle" },
                      { label: "Rounded square", value: "rounded" },
                    ]}
                    value={settings.buttonShape}
                    onChange={update("buttonShape")}
                  />

                  <Select
                    label="Button position"
                    disabled={!isPro}
                    options={[
                      { label: "Bottom right", value: "bottom-right" },
                      { label: "Bottom left", value: "bottom-left" },
                      { label: "Top right", value: "top-right" },
                      { label: "Top left", value: "top-left" },
                    ]}
                    value={settings.position}
                    onChange={update("position")}
                  />

                  <Select
                    label="Icon type"
                    disabled={!isPro}
                    options={[
                      { label: "Default cart icon", value: "default" },
                      { label: "Emoji", value: "emoji" },
                      { label: "Image URL", value: "image" },
                    ]}
                    value={settings.iconType}
                    onChange={update("iconType")}
                  />

                  <TextField
                    label="Custom emoji"
                    disabled={!isPro || settings.iconType !== "emoji"}
                    value={settings.customEmoji}
                    onChange={update("customEmoji")}
                    placeholder="🛍️"
                  />

                  <TextField
                    label="Custom icon image URL"
                    disabled={!isPro || settings.iconType !== "image"}
                    value={settings.customIconUrl}
                    onChange={update("customIconUrl")}
                    placeholder="https://example.com/icon.png"
                  />

                  <Select
                    label="Attention effect"
                    disabled={!isPro}
                    options={[
                      { label: "None", value: "none" },
                      { label: "Pulse", value: "pulse" },
                      { label: "Glow", value: "glow" },
                    ]}
                    value={settings.effect}
                    onChange={update("effect")}
                  />

                  <TextField
                    label="Button color"
                    type="color"
                    disabled={!isPro}
                    value={settings.buttonColor}
                    onChange={update("buttonColor")}
                  />

                  <TextField
                    label="Badge color"
                    type="color"
                    disabled={!isPro}
                    value={settings.badgeColor}
                    onChange={update("badgeColor")}
                  />

                  <Checkbox
                    label="Auto match theme color"
                    disabled={!isPro}
                    checked={Boolean(settings.autoMatchTheme)}
                    onChange={update("autoMatchTheme")}
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd">Drawer Settings</Text>
                  <Badge tone={isPro ? "success" : "warning"}>
                    {isPro ? "Pro active" : "Pro only"}
                  </Badge>
                </InlineStack>

                <Divider />

                <FormLayout>
                  <Checkbox
                    label="Enable free shipping progress bar"
                    disabled={!isPro}
                    checked={Boolean(settings.freeShippingEnabled)}
                    onChange={update("freeShippingEnabled")}
                  />

                  <TextField
                    label="Free shipping threshold"
                    disabled={!isPro || !settings.freeShippingEnabled}
                    type="number"
                    prefix="$"
                    min="0"
                    max="5000"
                    value={String(settings.freeShippingThreshold)}
                    onChange={updateNumber("freeShippingThreshold")}
                    helpText="Example: 50 means free shipping after $50 cart total."
                  />

                  <Checkbox
                    label="Enable discount code field"
                    disabled={!isPro}
                    checked={Boolean(settings.discountEnabled)}
                    onChange={update("discountEnabled")}
                  />

                  <TextField
                    label="Checkout button text"
                    disabled={!isPro}
                    value={settings.checkoutText}
                    onChange={update("checkoutText")}
                    placeholder="Checkout"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd">Visibility Rules</Text>
                  <Badge tone={isPro ? "success" : "warning"}>
                    {isPro ? "Pro active" : "Pro only"}
                  </Badge>
                </InlineStack>

                <Divider />

                <FormLayout>
                  <Checkbox
                    label="Show on mobile"
                    disabled={!isPro}
                    checked={Boolean(settings.showMobile)}
                    onChange={update("showMobile")}
                  />

                  <Checkbox
                    label="Show on desktop"
                    disabled={!isPro}
                    checked={Boolean(settings.showDesktop)}
                    onChange={update("showDesktop")}
                  />

                  <TextField
                    label="Hide on pages containing"
                    disabled={!isPro}
                    value={settings.hidePages}
                    onChange={update("hidePages")}
                    helpText="Separate multiple paths with commas. Example: /checkout,/pages/landing"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Preview Summary</Text>

            <Text tone="subdued">
              Shape: <strong>{settings.buttonShape}</strong> · Icon:{" "}
              <strong>{settings.iconType}</strong> · Drawer:{" "}
              <strong>{settings.cartDrawer ? "Enabled" : "Disabled"}</strong>{" "}
              · Free shipping:{" "}
              <strong>
                {settings.freeShippingEnabled
                  ? `$${settings.freeShippingThreshold}`
                  : "Disabled"}
              </strong>
            </Text>

            <Text tone="subdued">
              After saving, go to Online Store → Themes → Customize → App embeds
              and make sure Floating Cart Button is enabled.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}