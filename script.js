// ============================================
// DROP COUNTDOWN
// Edit DROP_DATE to your real drop date whenever you know it.
// ============================================
const DROP_DATE = new Date('2026-09-05T00:00:00Z'); // ~1 month out — update to the real date

function renderCountdown() {
  const el = document.getElementById("dropCountdown");
  if (!el) return;
  const daysLeft = Math.ceil((DROP_DATE - new Date()) / (1000 * 60 * 60 * 24));
  el.textContent = daysLeft > 0 ? `DROPS IN ${daysLeft} DAY${daysLeft === 1 ? "" : "S"}` : "AVAILABLE NOW";
}
renderCountdown();

// ============================================
// MENU DRAWER
// ============================================
const menuToggleBtn = document.getElementById("menuToggleBtn");
const menuOverlay = document.getElementById("menuOverlay");
const menuBackdrop = document.getElementById("menuBackdrop");

function closeMenu() {
  menuOverlay.classList.remove("open");
  menuBackdrop.classList.remove("open");
  menuToggleBtn.setAttribute("aria-expanded", "false");
}
function openMenu() {
  menuOverlay.classList.add("open");
  menuBackdrop.classList.add("open");
  menuToggleBtn.setAttribute("aria-expanded", "true");
}

menuToggleBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (menuOverlay.classList.contains("open")) closeMenu(); else openMenu();
});
menuOverlay.querySelectorAll(".menu-overlay-link").forEach((link) => {
  link.addEventListener("click", closeMenu);
});
menuBackdrop.addEventListener("click", closeMenu);
document.getElementById("menuCloseBtn").addEventListener("click", closeMenu);
document.getElementById("menuWordmarkLink").addEventListener("click", closeMenu);

// ============================================
// ACCORDION (Product Details / Shipping & Returns)
// ============================================
document.querySelectorAll(".accordion-toggle").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const panel = document.getElementById(toggle.dataset.target);
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    panel.style.maxHeight = isOpen ? "0px" : `${panel.scrollHeight}px`;
  });
});

// ============================================
// PRODUCT — single item for this week's drop.
// To add more products later, turn this into an array
// and repeat the .product section per item.
// ============================================
const PRODUCT = { code: "LSD-MAG-01", name: "lsd mag slip ons", price: 200.00 };

let selectedSize = null;
const quantity = 1; // one product for now — bump this if you add a quantity control back later
let cart = []; // { size, qty, price }

const sizeSelect = document.getElementById("sizeSelect");
const sizeWarning = document.getElementById("sizeWarning");

sizeSelect.addEventListener("change", () => {
  selectedSize = sizeSelect.value;
  sizeWarning.hidden = true;
});

function addCurrentSelectionToCart() {
  if (!selectedSize) {
    sizeWarning.hidden = false;
    return false;
  }
  const existing = cart.find((item) => item.size === selectedSize);
  if (existing) {
    existing.qty += quantity;
  } else {
    cart.push({ size: selectedSize, qty: quantity, price: PRODUCT.price });
  }

  // ---- analytics: add to cart ----
  if (typeof gtag === "function") {
    gtag("event", "add_to_cart", {
      currency: "USD",
      value: PRODUCT.price * quantity,
      items: [{ item_id: PRODUCT.code, item_name: PRODUCT.name, price: PRODUCT.price, quantity, item_variant: selectedSize }],
    });
  }
  if (typeof fbq === "function") {
    fbq("track", "AddToCart", {
      content_ids: [PRODUCT.code],
      content_name: PRODUCT.name,
      content_type: "product",
      value: PRODUCT.price * quantity,
      currency: "USD",
    });
  }

  renderCart();
  return true;
}

document.getElementById("addToCartBtn").addEventListener("click", () => {
  if (addCurrentSelectionToCart()) openCart();
});

// "Buy with Pay" — adds to cart and jumps straight to checkout, mirroring
// an express-checkout button. Swap in real Apple Pay via Stripe later.
document.getElementById("applePayBtn").addEventListener("click", () => {
  if (addCurrentSelectionToCart()) openCheckoutModal();
});

// ============================================
// PREORDER — email capture via Netlify Forms, no backend code needed.
// Submissions land in Netlify dashboard → Forms.
// ============================================
const preorderBtn = document.getElementById("preorderBtn");
const preorderForm = document.getElementById("preorderForm");
const preorderSuccess = document.getElementById("preorderSuccess");
const preorderError = document.getElementById("preorderError");

preorderBtn.addEventListener("click", () => {
  preorderForm.hidden = !preorderForm.hidden;
  if (!preorderForm.hidden) document.getElementById("preorderEmail").focus();
});

function encodeFormData(data) {
  return Object.keys(data)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
}

preorderForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("preorderEmail").value;
  preorderError.hidden = true;

  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: encodeFormData({ "form-name": "preorder", email }),
  })
    .then(() => {
      preorderForm.hidden = true;
      preorderSuccess.hidden = false;

      if (typeof gtag === "function") {
        gtag("event", "generate_lead", { currency: "USD", value: 0 });
      }
      if (typeof fbq === "function") {
        fbq("track", "Lead");
      }
    })
    .catch(() => {
      preorderError.hidden = false;
    });
});

// ============================================
// LOCAL CURRENCY DISPLAY (informational only — the actual PayPal/Stripe
// charge always stays in USD; this just shows visitors a familiar estimate).
// ============================================
const COUNTRY_CURRENCY = {
  AE: "AED", SA: "SAR", KW: "KWD", QA: "QAR", BH: "BHD", OM: "OMR", JO: "JOD", LB: "LBP", EG: "EGP",
  GB: "GBP", IE: "EUR", FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", PT: "EUR", BE: "EUR",
  AT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  CA: "CAD", AU: "AUD", NZ: "NZD", IN: "INR", PK: "PKR", TR: "TRY", JP: "JPY", CN: "CNY",
  SG: "SGD", HK: "HKD", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", ZA: "ZAR", BR: "BRL",
  MX: "MXN", KR: "KRW", US: "USD",
};

function detectLocalCurrency() {
  try {
    const locale = navigator.language || (navigator.languages && navigator.languages[0]) || "en-US";
    const region = locale.split("-")[1] ? locale.split("-")[1].toUpperCase() : null;
    return (region && COUNTRY_CURRENCY[region]) || null;
  } catch (e) {
    return null;
  }
}

let exchangeRates = null;
const localCurrency = detectLocalCurrency();

function formatLocalEquivalent(usdAmount) {
  if (!exchangeRates || !localCurrency || localCurrency === "USD" || !exchangeRates[localCurrency]) return "";
  const converted = usdAmount * exchangeRates[localCurrency];
  try {
    return new Intl.NumberFormat(navigator.language, {
      style: "currency",
      currency: localCurrency,
      maximumFractionDigits: 0,
    }).format(converted);
  } catch (e) {
    return `${localCurrency} ${converted.toFixed(0)}`;
  }
}

function updateLocalPriceDisplays() {
  const priceEl = document.getElementById("productPriceLocal");
  if (priceEl) {
    const equiv = formatLocalEquivalent(PRODUCT.price);
    priceEl.textContent = equiv ? `≈ ${equiv}` : "";
  }
  renderCart(); // refreshes cart subtotal with local equivalent too
}

async function loadExchangeRates() {
  if (!localCurrency || localCurrency === "USD") return;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data && data.rates) {
      exchangeRates = data.rates;
      updateLocalPriceDisplays();
    }
  } catch (e) {
    // network hiccup or blocked — USD-only display is a perfectly fine fallback
  }
}
loadExchangeRates();

// ============================================
// CART DRAWER
// ============================================
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartBackdrop = document.getElementById("cartBackdrop");
const cartClose = document.getElementById("cartClose");
const cartItemsEl = document.getElementById("cartItems");
const cartEmptyEl = document.getElementById("cartEmpty");
const cartSubtotalEl = document.getElementById("cartSubtotal");

function cartTotalItems() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}
function cartSubtotal() {
  return cart.reduce((sum, item) => sum + item.qty * item.price, 0);
}

function renderCart() {
  const totalItems = cartTotalItems();
  cartCount.textContent = totalItems;
  cartCount.hidden = totalItems === 0;

  cartEmptyEl.hidden = cart.length !== 0;
  cartItemsEl.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div>
        <p class="cart-item-name">${PRODUCT.name}</p>
        <p class="cart-item-meta">SIZE ${item.size} · QTY ${item.qty}</p>
        <button class="cart-item-remove" data-index="${i}">REMOVE</button>
      </div>
      <span class="cart-item-price">$${(item.qty * item.price).toFixed(2)}</span>
    </div>
  `).join("");

  cartItemsEl.querySelectorAll(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      cart.splice(Number(btn.dataset.index), 1);
      renderCart();
    });
  });

  const subtotalLocal = formatLocalEquivalent(cartSubtotal());
  cartSubtotalEl.textContent = subtotalLocal
    ? `$${cartSubtotal().toFixed(2)} (≈ ${subtotalLocal})`
    : `$${cartSubtotal().toFixed(2)}`;
}

function openCart() {
  cartDrawer.classList.add("open");
  cartBackdrop.classList.add("open");
  document.body.classList.add("cart-open");
}
function closeCart() {
  cartDrawer.classList.remove("open");
  cartBackdrop.classList.remove("open");
  document.body.classList.remove("cart-open");
}

cartBtn.addEventListener("click", openCart);
cartClose.addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", closeCart);

// ============================================
// CHECKOUT SUMMARY
// Replace the placeholder inside checkoutBtn's click handler with a real
// redirect once you have a Stripe Payment Link, e.g.:
//   window.location.href = "https://buy.stripe.com/your_link_here";
// ============================================
const checkoutBtn = document.getElementById("checkoutBtn");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutBackdrop = document.getElementById("checkoutBackdrop");
const checkoutClose = document.getElementById("checkoutClose");
const checkoutSummary = document.getElementById("checkoutSummary");

function openCheckoutModal() {
  if (cart.length === 0) return;

  checkoutSummary.innerHTML = cart.map((item) => `
    <div class="checkout-line">
      <span>${PRODUCT.name} · SIZE ${item.size} × ${item.qty}</span>
      <span>$${(item.qty * item.price).toFixed(2)}</span>
    </div>
  `).join("") + `
    <div class="checkout-total">
      <span>TOTAL</span>
      <span>$${cartSubtotal().toFixed(2)}${formatLocalEquivalent(cartSubtotal()) ? ` (≈ ${formatLocalEquivalent(cartSubtotal())})` : ""}</span>
    </div>
  `;

  // ---- analytics: begin checkout ----
  if (typeof gtag === "function") {
    gtag("event", "begin_checkout", {
      currency: "USD",
      value: cartSubtotal(),
      items: cart.map((item) => ({ item_id: PRODUCT.code, item_name: PRODUCT.name, price: item.price, quantity: item.qty, item_variant: item.size })),
    });
  }
  if (typeof fbq === "function") {
    fbq("track", "InitiateCheckout", {
      content_ids: [PRODUCT.code],
      content_type: "product",
      value: cartSubtotal(),
      currency: "USD",
      num_items: cartTotalItems(),
    });
  }

  checkoutModal.classList.add("open");
  checkoutBackdrop.classList.add("open");
  renderPayPalButtons();
}

// ============================================
// PAYPAL — client-side order creation + capture, no backend needed.
// Buttons are re-rendered each time the modal opens so the total
// always reflects the current cart.
// ============================================
const paypalContainer = document.getElementById("paypal-button-container");
const checkoutSuccess = document.getElementById("checkoutSuccess");

function renderPayPalButtons() {
  if (typeof paypal === "undefined") return; // SDK blocked or failed to load
  paypalContainer.innerHTML = ""; // clear any previous render before re-rendering
  checkoutSuccess.hidden = true;

  paypal.Buttons({
    style: { layout: "vertical", color: "black", shape: "rect", label: "paypal" },
    createOrder: (data, actions) => {
      const description = cart.map((item) => `${PRODUCT.name} · SIZE ${item.size} × ${item.qty}`).join("; ");
      return actions.order.create({
        purchase_units: [{
          amount: { value: cartSubtotal().toFixed(2), currency_code: "USD" },
          description: description.slice(0, 127), // PayPal caps description length
        }],
      });
    },
    onApprove: (data, actions) => {
      return actions.order.capture().then((details) => {
        // ---- analytics: purchase ----
        if (typeof gtag === "function") {
          gtag("event", "purchase", {
            transaction_id: details.id,
            currency: "USD",
            value: cartSubtotal(),
            items: cart.map((item) => ({ item_id: PRODUCT.code, item_name: PRODUCT.name, price: item.price, quantity: item.qty, item_variant: item.size })),
          });
        }
        if (typeof fbq === "function") {
          fbq("track", "Purchase", { value: cartSubtotal(), currency: "USD" });
        }

        checkoutSuccess.textContent = `PAYMENT CONFIRMED — THANK YOU, ${details.payer.name.given_name.toUpperCase()}. A CONFIRMATION HAS BEEN SENT TO ${details.payer.email_address}.`;
        checkoutSuccess.hidden = false;
        paypalContainer.innerHTML = "";
        cart = [];
        renderCart();
      });
    },
    onError: (err) => {
      checkoutError.textContent = "PAYPAL CHECKOUT FAILED — TRY AGAIN OR USE CARD PAYMENT BELOW.";
      checkoutError.hidden = false;
    },
  }).render("#paypal-button-container");
}

checkoutBtn.addEventListener("click", openCheckoutModal);

// ============================================
// STRIPE — calls the create-checkout-session Netlify Function,
// which builds a real Checkout Session from the cart and returns
// its URL. Requires STRIPE_SECRET_KEY set in Netlify's environment
// variables (Site configuration → Environment variables).
// ============================================
const stripeCheckoutBtn = document.getElementById("stripeCheckoutBtn");
const checkoutError = document.getElementById("checkoutError");

stripeCheckoutBtn.addEventListener("click", async () => {
  if (cart.length === 0) return;

  checkoutError.hidden = true;
  stripeCheckoutBtn.disabled = true;
  stripeCheckoutBtn.textContent = "REDIRECTING…";

  try {
    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
    });
    const data = await res.json();

    if (!res.ok || !data.url) {
      throw new Error(data.error || "Something went wrong starting checkout.");
    }

    window.location.href = data.url; // hand off to Stripe's hosted checkout page
  } catch (err) {
    checkoutError.textContent = `COULDN'T START CHECKOUT: ${err.message}`;
    checkoutError.hidden = false;
    stripeCheckoutBtn.disabled = false;
    stripeCheckoutBtn.textContent = "PROCEED TO PAYMENT";
  }
});

function closeCheckout() {
  checkoutModal.classList.remove("open");
  checkoutBackdrop.classList.remove("open");
}
checkoutClose.addEventListener("click", closeCheckout);
checkoutBackdrop.addEventListener("click", closeCheckout);

// ---- footer year ----
document.getElementById("year").textContent = new Date().getFullYear();

// ---- initial render ----
renderCart();
