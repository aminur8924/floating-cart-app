(function () {
  "use strict";

  const btn = document.getElementById("fc-floating-cart");
  if (!btn) return;

  const badge = document.getElementById("fc-badge");

  const cartDrawerEnabled =
    btn.dataset.cartDrawer === "true";

  const showMobile =
    btn.dataset.showMobile === "true";

  const showDesktop =
    btn.dataset.showDesktop === "true";

  const hidePages =
    btn.dataset.hidePages || "";

  const freeShippingEnabled =
    btn.dataset.freeShippingEnabled === "true";

  const freeShippingThreshold =
    Number(btn.dataset.freeShippingThreshold || 50) * 100;

  const discountEnabled =
    btn.dataset.discountEnabled === "true";

  const checkoutText =
    btn.dataset.checkoutText || "Checkout";

  const drawer =
    document.getElementById("fc-drawer");

  const drawerOverlay =
    document.getElementById("fc-drawer-overlay");

  const drawerClose =
    document.getElementById("fc-drawer-close");

  const drawerBody =
    document.getElementById("fc-drawer-body");

  const drawerFooter =
    document.getElementById("fc-drawer-footer");

  const freeShippingBox =
    document.getElementById("fc-free-shipping");

  const freeShippingText =
    document.getElementById("fc-free-shipping-text");

  const freeShippingFill =
    document.getElementById("fc-free-shipping-fill");

  const discountBox =
    document.getElementById("fc-discount-box");

  const discountInput =
    document.getElementById("fc-discount-input");

  const discountApply =
    document.getElementById("fc-discount-apply");

  /* -----------------------------
     Visibility Rules
  ----------------------------- */

  function applyVisibilityRules() {
    const path = window.location.pathname;

    const isMobile =
      window.matchMedia("(max-width: 767px)").matches;

    if (isMobile && !showMobile) {
      btn.classList.add("fc-hidden");
    }

    if (!isMobile && !showDesktop) {
      btn.classList.add("fc-hidden");
    }

    const hiddenList = hidePages
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const shouldHide =
      hiddenList.some((rule) => path.includes(rule));

    if (shouldHide) {
      btn.classList.add("fc-hidden");
    }
  }

  applyVisibilityRules();

  /* -----------------------------
     Auto Theme Match
  ----------------------------- */

  function autoMatchTheme() {
    try {
      if (
        btn.style.getPropertyValue("--fc-auto-match") !==
        "true"
      ) {
        return;
      }

      const themeBtn =
        document.querySelector(".btn--primary") ||
        document.querySelector(
          'button[type="submit"]'
        ) ||
        document.querySelector(
          ".product-form__submit"
        );

      if (!themeBtn) return;

      const computed =
        window.getComputedStyle(themeBtn);

      const bg = computed.backgroundColor;

      if (
        bg &&
        bg !== "rgba(0, 0, 0, 0)" &&
        bg !== "transparent"
      ) {
        btn.style.setProperty("--fc-color", bg);
      }
    } catch (e) {}
  }

  autoMatchTheme();

  /* -----------------------------
     Cart Fetch
  ----------------------------- */

  async function fetchCart() {
    const res = await fetch("/cart.js");
    return await res.json();
  }

  async function fetchCartCount() {
    try {
      const cart = await fetchCart();
      updateBadge(cart.item_count);
    } catch (e) {
      console.warn(
        "[FloatingCart] Could not fetch cart:",
        e
      );
    }
  }

  /* -----------------------------
     Badge Update
  ----------------------------- */

  function updateBadge(count) {
    if (!badge) return;

    badge.textContent =
      count > 99 ? "99+" : count;

    badge.dataset.count = count;

    badge.classList.remove("fc-badge-pop");

    void badge.offsetWidth;

    badge.classList.add("fc-badge-pop");
  }

  /* -----------------------------
     Ajax Cart Detection
  ----------------------------- */

  function interceptAjaxCart() {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const response =
        await originalFetch.apply(this, args);

      const url =
        args[0]?.toString() || "";

      if (
        url.includes("/cart/add") ||
        url.includes("/cart/change") ||
        url.includes("/cart/update") ||
        url.includes("/cart/clear")
      ) {
        setTimeout(async () => {
          await fetchCartCount();

          if (
            drawer?.classList.contains("fc-open")
          ) {
            loadDrawerCart();
          }
        }, 300);
      }

      return response;
    };
  }

  interceptAjaxCart();

  fetchCartCount();

  /* -----------------------------
     Cart Button Click
  ----------------------------- */

  btn.addEventListener("click", handleCartClick);

  btn.addEventListener("keydown", (e) => {
    if (
      e.key === "Enter" ||
      e.key === " "
    ) {
      handleCartClick(e);
    }
  });

  function handleCartClick(e) {
    e.preventDefault();

    if (
      cartDrawerEnabled &&
      drawer
    ) {
      openDrawer();
    } else {
      window.location.href = "/cart";
    }
  }

  /* -----------------------------
     Drawer Open / Close
  ----------------------------- */

  function openDrawer() {
    drawer.classList.add("fc-open");

    drawerOverlay?.classList.add("fc-open");

    document.body.style.overflow =
      "hidden";

    loadDrawerCart();
  }

  function closeDrawer() {
    drawer.classList.remove("fc-open");

    drawerOverlay?.classList.remove(
      "fc-open"
    );

    document.body.style.overflow =
      "";
  }

  drawerClose?.addEventListener(
    "click",
    closeDrawer
  );

  drawerOverlay?.addEventListener(
    "click",
    closeDrawer
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (
        e.key === "Escape" &&
        drawer?.classList.contains(
          "fc-open"
        )
      ) {
        closeDrawer();
      }
    }
  );

  /* -----------------------------
     Drawer Cart Render
  ----------------------------- */

  async function loadDrawerCart() {
    if (!drawerBody) return;

    drawerBody.innerHTML =
      '<div class="fc-drawer-loading">Loading cart...</div>';

    try {
      const cart = await fetchCart();

      updateBadge(cart.item_count);

      renderFreeShipping(cart);

      renderDiscountBox();

      renderDrawerCart(cart);
    } catch (e) {
      drawerBody.innerHTML =
        '<div class="fc-drawer-loading">Could not load cart.</div>';
    }
  }

  /* -----------------------------
     Free Shipping
  ----------------------------- */

  function renderFreeShipping(cart) {
    if (
      !freeShippingBox ||
      !freeShippingEnabled
    ) {
      return;
    }

    freeShippingBox.hidden = false;

    const total =
      cart.total_price || 0;

    const remaining =
      Math.max(
        freeShippingThreshold - total,
        0
      );

    const progress = Math.min(
      (total /
        freeShippingThreshold) *
        100,
      100
    );

    if (remaining <= 0) {
      freeShippingText.textContent =
        "🎉 You unlocked free shipping!";
    } else {
      freeShippingText.textContent =
        `${formatMoney(
          remaining
        )} away from free shipping`;
    }

    freeShippingFill.style.width =
      `${progress}%`;
  }

  /* -----------------------------
     Discount Box
  ----------------------------- */

  function renderDiscountBox() {
    if (!discountBox) return;

    discountBox.hidden =
      !discountEnabled;
  }

  discountApply?.addEventListener(
    "click",
    () => {
      const code =
        discountInput?.value.trim();

      if (!code) {
        discountInput?.focus();
        return;
      }

      discountApply.innerHTML =
        "Applying...";

      setTimeout(() => {
        window.location.href =
          `/discount/${encodeURIComponent(
            code
          )}?redirect=/checkout`;
      }, 600);
    }
  );

  /* -----------------------------
     Cart Items
  ----------------------------- */

  function renderDrawerCart(cart) {
    if (
      !drawerBody ||
      !drawerFooter
    ) {
      return;
    }

    if (
      !cart.items ||
      cart.item_count === 0
    ) {
      drawerBody.innerHTML = `
        <div class="fc-cart-empty">
          <p>Your cart is empty</p>
        </div>
      `;

      drawerFooter.innerHTML = "";

      return;
    }

    drawerBody.innerHTML =
      cart.items
        .map((item) => {
          const image =
            item.image || "";

          const title =
            escapeHtml(
              item.product_title ||
                item.title ||
                "Item"
            );

          const variant =
            item.variant_title
              ? escapeHtml(
                  item.variant_title
                )
              : "";

          const key =
            escapeHtml(item.key);

          return `
          <div class="fc-cart-item" data-key="${key}">
            <img
              class="fc-cart-item-img"
              src="${image}"
              alt="${title}"
            >

            <div class="fc-cart-item-info">
              <p class="fc-cart-item-title">
                ${title}
              </p>

              ${
                variant
                  ? `<p class="fc-cart-item-variant">${variant}</p>`
                  : ""
              }

              <p class="fc-cart-item-price">
                ${formatMoney(
                  item.final_line_price
                )}
              </p>

              <div class="fc-cart-actions">

                <div class="fc-qty-control">

                  <button
                    class="fc-qty-btn"
                    data-fc-action="decrease"
                    data-key="${key}"
                  >
                    −
                  </button>

                  <span class="fc-qty-number">
                    ${item.quantity}
                  </span>

                  <button
                    class="fc-qty-btn"
                    data-fc-action="increase"
                    data-key="${key}"
                  >
                    +
                  </button>

                </div>

                <button
                  class="fc-remove-btn"
                  data-fc-action="remove"
                  data-key="${key}"
                >
                  Remove
                </button>

              </div>
            </div>
          </div>
        `;
        })
        .join("");

    drawerFooter.innerHTML = `
      <div class="fc-subtotal">
        <span>Subtotal</span>
        <span>${formatMoney(
          cart.total_price
        )}</span>
      </div>

      <a
        href="/checkout"
        class="fc-checkout-btn"
      >
        ${checkoutText}
      </a>
    `;
  }

  /* -----------------------------
     Qty Change
  ----------------------------- */

  drawerBody?.addEventListener(
    "click",
    async (e) => {
      const target =
        e.target.closest(
          "[data-fc-action]"
        );

      if (!target) return;

      const action =
        target.dataset.fcAction;

      const key =
        target.dataset.key;

      if (!key) return;

      const itemEl =
        target.closest(
          ".fc-cart-item"
        );

      const qtyEl =
        itemEl?.querySelector(
          ".fc-qty-number"
        );

      const currentQty =
        Number(
          qtyEl?.textContent || 1
        );

      let newQty = currentQty;

      if (action === "increase") {
        newQty =
          currentQty + 1;
      }

      if (action === "decrease") {
        newQty = Math.max(
          currentQty - 1,
          0
        );
      }

      if (action === "remove") {
        newQty = 0;
      }

      await changeCartItem(
        key,
        newQty
      );
    }
  );

  async function changeCartItem(
    key,
    quantity
  ) {
    try {
      await fetch(
        "/cart/change.js",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
          body: JSON.stringify({
            id: key,
            quantity,
          }),
        }
      );

      await loadDrawerCart();

      await fetchCartCount();
    } catch (e) {
      console.warn(
        "[FloatingCart] Could not update cart:",
        e
      );
    }
  }

  /* -----------------------------
     Helpers
  ----------------------------- */

  function formatMoney(cents) {
    try {
      if (
        window.Shopify &&
        Shopify.currency &&
        Shopify.currency.active
      ) {
        return new Intl.NumberFormat(
          undefined,
          {
            style: "currency",
            currency:
              Shopify.currency.active,
          }
        ).format(cents / 100);
      }
    } catch (e) {}

    return (
      "$" +
      (cents / 100).toFixed(2)
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();