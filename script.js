const products = [
  {
    id: 1,
    name: "中秋限定禮盒",
    price: 666,
    originalPrice: 888,
    category: "禮盒",
    description: "天竺鼠店長精選中秋限定禮盒，適合送禮與團聚。",
    image: "images/product-box.png"
  },
  {
    id: 2,
    name: "桂花奶黃月餅",
    price: 99,
    originalPrice: 120,
    category: "單顆月餅",
    description: "香氣淡雅、口感濃郁，是中秋經典熱銷口味。",
    image: "images/mooncake.png"
  },
  {
    id: 3,
    name: "黑糖可可月餅",
    price: 99,
    originalPrice: 120,
    category: "單顆月餅",
    description: "黑糖香氣搭配可可風味，濃郁不膩口。",
    image: "images/mooncake.png"
  },
  {
    id: 4,
    name: "柚香白玉月餅",
    price: 99,
    originalPrice: 120,
    category: "單顆月餅",
    description: "清爽柚香與白玉內餡，適合喜歡清新口味的人。",
    image: "images/mooncake.png"
  },
  {
    id: 5,
    name: "三色糰子",
    price: 69,
    originalPrice: 89,
    category: "糰子",
    description: "橘香、原味、黑糖三種口味一次滿足。",
    image: "images/dango.png"
  }
];

const cart = [];
let selectedProduct = null;
let modalQty = 1;
let appliedCoupon = null;

const couponRules = {
  MOON88: { type: "percent", value: 0.12, label: "滿額再折 12%" },
  DANGO50: { type: "fixed", value: 50, label: "折抵 NT$50" },
  TSUKI100: { type: "fixed", value: 100, label: "折抵 NT$100" }
};

function track(eventName, params = {}) {
  console.log("GA4 Event:", eventName, params);

  if (typeof gtag === "function") {
    gtag("event", eventName, params);
  }

  if (window.dataLayer) {
    window.dataLayer.push({ event: eventName, ...params });
  }
}

function formatMoney(num) {
  return `NT$${Math.max(0, Math.round(num))}`;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = products.map(product => `
    <article class="product-card">
      <div class="product-card__media">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-card__body">
        <span class="pill">${product.category}</span>
        <h3 class="product-title">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="price-row">
          <span class="price">${formatMoney(product.price)}</span>
          <span class="original">原價 ${formatMoney(product.originalPrice)}</span>
        </div>
        <div class="product-actions">
          <button class="btn btn--secondary" onclick="openModal(${product.id})">查看詳情</button>
          <button class="btn btn--primary" onclick="addToCart(${product.id}, 1)">加入購物車</button>
        </div>
      </div>
    </article>
  `).join("");

  track("view_item_list", {
    item_list_name: "商品列表",
    items: products.map(p => ({
      item_id: p.id,
      item_name: p.name,
      item_category: p.category,
      price: p.price
    }))
  });
}

function openModal(productId) {
  const product = products.find(p => p.id === productId);
  selectedProduct = product;
  modalQty = 1;
  updateModalQty();

  document.getElementById("modalImage").src = product.image;
  document.getElementById("modalImage").alt = product.name;
  document.getElementById("modalTag").textContent = product.category;
  document.getElementById("modalTitle").textContent = product.name;
  document.getElementById("modalDesc").textContent = product.description;
  document.getElementById("modalPrice").textContent = formatMoney(product.price);
  document.getElementById("modalOriginal").textContent = `原價 ${formatMoney(product.originalPrice)}`;

  document.getElementById("modalAddBtn").onclick = () => {
    addToCart(product.id, modalQty);
    closeModal();
  };

  document.getElementById("modalBackdrop").classList.add("show");

  track("view_item", {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    price: product.price,
    currency: "TWD"
  });
}

function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById("modalBackdrop").classList.remove("show");
}

function changeModalQty(delta) {
  modalQty = Math.max(1, modalQty + delta);
  updateModalQty();
}

function updateModalQty() {
  document.getElementById("modalQty").textContent = modalQty;
}

function addToCart(productId, qty = 1) {
  const product = products.find(p => p.id === productId);

  for (let i = 0; i < qty; i++) {
    cart.push({ ...product });
  }

  renderCart();

  track("add_to_cart", {
    currency: "TWD",
    value: product.price * qty,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      quantity: qty
    }]
  });
}

function getGroupedCart() {
  const map = {};
  cart.forEach(item => {
    if (!map[item.id]) map[item.id] = { ...item, qty: 0 };
    map[item.id].qty += 1;
  });
  return Object.values(map);
}

function getSubtotal() {
  return cart.reduce((sum, item) => sum + item.price, 0);
}

function getThresholdDiscount(subtotal) {
  return subtotal >= 1500 ? Math.round(subtotal * 0.12) : 0;
}

function getCouponDiscount(subtotal) {
  if (!appliedCoupon) return 0;
  const rule = couponRules[appliedCoupon];
  if (!rule) return 0;

  if (rule.type === "fixed") return Math.min(rule.value, subtotal);
  if (rule.type === "percent") return subtotal >= 1500 ? Math.round(subtotal * rule.value) : 0;
  return 0;
}

function renderCart() {
  const list = document.getElementById("cartList");
  const empty = document.getElementById("emptyCart");
  const subtotal = getSubtotal();
  const thresholdDiscount = getThresholdDiscount(subtotal);
  const couponDiscount = getCouponDiscount(subtotal);
  const total = subtotal - thresholdDiscount - couponDiscount;

  document.getElementById("subtotal").textContent = formatMoney(subtotal);
  document.getElementById("thresholdDiscount").textContent = `-${formatMoney(thresholdDiscount)}`;
  document.getElementById("couponDiscount").textContent = `-${formatMoney(couponDiscount)}`;
  document.getElementById("total").textContent = formatMoney(total);

  if (cart.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  const grouped = getGroupedCart();

  list.innerHTML = grouped.map(item => `
    <div class="cart-item">
      <div class="cart-thumb">
        <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="cart-info">
        <h4>${item.name}</h4>
        <p>單價 ${formatMoney(item.price)}</p>
        <div class="qty-controls">
          <button onclick="decreaseQty(${item.id})">−</button>
          <span>數量 ${item.qty}</span>
          <button onclick="increaseQty(${item.id})">+</button>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:900; color:#e06d00;">${formatMoney(item.price * item.qty)}</div>
        <button class="btn btn--secondary" style="margin-top:8px; padding:8px 12px;" onclick="removeAllOfItem(${item.id})">移除</button>
      </div>
    </div>
  `).join("");
}

function increaseQty(productId) {
  const product = products.find(p => p.id === productId);
  cart.push({ ...product });
  renderCart();
}

function decreaseQty(productId) {
  const index = cart.findIndex(item => item.id === productId);
  if (index !== -1) {
    cart.splice(index, 1);
    renderCart();
  }
}

function removeAllOfItem(productId) {
  for (let i = cart.length - 1; i >= 0; i--) {
    if (cart[i].id === productId) cart.splice(i, 1);
  }
  renderCart();
}

function clearCart() {
  cart.length = 0;
  appliedCoupon = null;
  document.getElementById("couponInput").value = "";
  document.getElementById("couponMsg").textContent = "可輸入：MOON88、DANGO50、TSUKI100";
  renderCart();
  track("clear_cart", {});
}

function applyCoupon() {
  const input = document.getElementById("couponInput").value.trim().toUpperCase();
  const msg = document.getElementById("couponMsg");

  if (!input) {
    msg.textContent = "請輸入折扣券代碼。";
    return;
  }

  if (!couponRules[input]) {
    appliedCoupon = null;
    msg.textContent = "折扣券無效，請重新確認代碼。";
    track("coupon_error", { coupon_code: input });
    renderCart();
    return;
  }

  appliedCoupon = input;
  msg.textContent = `已套用 ${input}：${couponRules[input].label}`;
  track("apply_coupon", {
    coupon_code: input,
    coupon_label: couponRules[input].label
  });
  renderCart();
}

function beginCheckout() {
  if (cart.length === 0) {
    alert("購物車是空的，請先加入商品。");
    return;
  }

  track("begin_checkout", {
    currency: "TWD",
    value: getSubtotal() - getThresholdDiscount(getSubtotal()) - getCouponDiscount(getSubtotal()),
    items: cart.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price,
      quantity: 1
    }))
  });

  document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
}

function submitOrder(event) {
  event.preventDefault();

  if (cart.length === 0) {
    alert("請先加入商品再送出訂單。");
    return;
  }

  const subtotal = getSubtotal();
  const thresholdDiscount = getThresholdDiscount(subtotal);
  const couponDiscount = getCouponDiscount(subtotal);
  const total = subtotal - thresholdDiscount - couponDiscount;

  track("purchase", {
    transaction_id: "ORDER_" + Date.now(),
    currency: "TWD",
    value: total,
    coupon: appliedCoupon || "",
    items: cart.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price,
      quantity: 1
    }))
  });

  track("generate_lead", {
    form_name: "訂購表單",
    contact_method: "表單送出"
  });

  alert("訂單已送出！感謝您的訂購。");

  clearCart();
  event.target.reset();
}

function contactClick(type) {
  track("contact_click", {
    contact_type: type,
    button_name: type === "phone" ? "電話聯絡" : type === "line" ? "LINE 聯絡" : "詢問表單"
  });

  if (type === "phone") alert("電話：0951-515-151");
  if (type === "line") alert("即將導向 LINE 官方帳號");
  if (type === "form") document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
}

window.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  renderCart();

  track("page_view", {
    page_title: document.title,
    page_location: window.location.href
  });
});

