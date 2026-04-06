const STORAGE_KEYS = {
  users: "expense-manager-users",
  currentUser: "expense-manager-current-user"
};

const authView = document.getElementById("authView");
const dashboardView = document.getElementById("dashboardView");
const signedInName = document.getElementById("signedInName");
const incomeTotal = document.getElementById("incomeTotal");
const expenseTotal = document.getElementById("expenseTotal");
const balanceTotal = document.getElementById("balanceTotal");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const pieCanvas = document.getElementById("pieChart");
const lineCanvas = document.getElementById("lineChart");
const pieLegend = document.getElementById("pieLegend");
const lineLegend = document.getElementById("lineLegend");

const categoryPalette = {
  Food: "#3182dd",
  Salary: "#20a36f",
  Travel: "#f59e0b",
  Shopping: "#f97316",
  Bills: "#8b5cf6",
  Health: "#ef4444",
  Other: "#64748b"
};

let authMode = "login";
let currentUser = getCurrentUser();
let editingTransactionId = null;

// ✅ Safe UUID generator
function safeUUID() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser) || "null");
}

function saveCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
  currentUser = user;
}

function seedDemoUser() {
  const users = getUsers();
  if (users.length > 0) return;

  const demoUser = {
    id: safeUUID(),
    name: "Nandhini S",
    email: "demo@example.com",
    password: "demo123",
    transactions: [
      {
        id: safeUUID(),
        title: "Groceries",
        amount: 200,
        category: "Food",
        type: "expense",
        date: "2026-04-05",
        notes: "Weekly essentials"
      }
    ]
  };

  saveUsers([demoUser]);
}

function updateCurrentUserRecord(updater) {
  const users = getUsers();
  const index = users.findIndex((user) => user.id === currentUser.id);
  if (index === -1) return;

  const updatedUser = updater(structuredClone(users[index]));
  users[index] = updatedUser;
  saveUsers(users);
  saveCurrentUser(updatedUser);
}

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${Math.abs(value).toFixed(2)}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderAuth() {
  const title = authMode === "login" ? "Welcome back" : "Create your account";
  const intro = authMode === "login"
    ? "Sign in to continue to your personal expense dashboard."
    : "Register to manage your own expenses, charts, and transaction history.";
  const button = authMode === "login" ? "Login" : "Register";
  const switchText = authMode === "login" ? "Need an account?" : "Already have an account?";
  const switchAction = authMode === "login" ? "Register here" : "Login here";

  authView.innerHTML = `
    <div class="auth-frame">
      <div class="auth-card auth-card-${authMode}">
        <p class="eyebrow">MULTI-ACCOUNT ACCESS</p>
        <h1>${title}</h1>
        <p>${intro}</p>
        <form id="authForm">
          ${authMode === "register" ? `
            <label>
              <span>Name</span>
              <input id="authName" type="text" required>
            </label>
          ` : ""}
          <label>
            <span>Email</span>
            <input id="authEmail" type="email" required>
          </label>
          <label>
            <span>Password</span>
            <input id="authPassword" type="password" required>
          </label>
          <button class="primary-btn" type="submit">${button}</button>
        </form>
        <p class="auth-switch">${switchText} <button id="authSwitch" class="inline-link" type="button">${switchAction}</button></p>
      </div>
    </div>
  `;

  document.getElementById("authSwitch").addEventListener("click", () => {
    authMode = authMode === "login" ? "register" : "login";
    render();
  });

  document.getElementById("authForm").addEventListener("submit", handleAuthSubmit);
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const email = document.getElementById("authEmail").value.trim().toLowerCase();
  const password = document.getElementById("authPassword").value.trim();
  const users = getUsers();

  if (authMode === "register") {
    const name = document.getElementById("authName").value.trim();
    if (!name) {
      alert("Please enter your name.");
      return;
    }

    if (users.some((user) => user.email === email)) {
      alert("An account with this email already exists.");
      return;
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      transactions: []
    };

    users.push(newUser);
    saveUsers(users);
    saveCurrentUser(newUser);
  } else {
    const user = users.find((entry) => entry.email === email && entry.password === password);
    if (!user) {
      alert("Invalid email or password. Try demo@example.com / demo123.");
      return;
    }
    saveCurrentUser(user);
  }

  render();
}

function getFilteredTransactions() {
  const transactions = currentUser?.transactions || [];
  const search = document.getElementById("searchFilter")?.value.trim().toLowerCase() || "";
  const type = document.getElementById("typeFilter")?.value || "all";
  const category = document.getElementById("categoryFilter")?.value || "all";
  const month = document.getElementById("monthFilter")?.value || "";

  return [...transactions]
    .filter((item) => item.title.toLowerCase().includes(search))
    .filter((item) => type === "all" || item.type === type)
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => !month || item.date.startsWith(month))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function populateCategoryFilter() {
  const categoryFilter = document.getElementById("categoryFilter");
  const categories = new Set(["all"]);
  (currentUser?.transactions || []).forEach((entry) => categories.add(entry.category));
  const previousValue = categoryFilter.value || "all";

  categoryFilter.innerHTML = "";
  [...categories].forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category === "all" ? "All categories" : category;
    categoryFilter.appendChild(option);
  });

  categoryFilter.value = [...categories].includes(previousValue) ? previousValue : "all";
}

function updateSummary() {
  const transactions = currentUser.transactions || [];
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = income - expense;

  incomeTotal.textContent = formatCurrency(income);
  expenseTotal.textContent = formatCurrency(expense);
  balanceTotal.textContent = formatCurrency(balance);
}

function renderHistory() {
  const transactions = getFilteredTransactions();
  historyCount.textContent = `${transactions.length} ${transactions.length === 1 ? "Item" : "Items"}`;

  if (transactions.length === 0) {
    historyList.innerHTML = `<div class="empty-state">No transactions match your current filters.</div>`;
    return;
  }

  historyList.innerHTML = transactions.map((item) => `
    <article class="history-item">
      <div>
        <div class="meta-row">
          <h4>${item.title}</h4>
          <span class="badge ${item.type === "expense" ? "badge-expense" : "badge-income"}">${capitalize(item.type)}</span>
        </div>
        <div class="meta-row">
          <span>${item.category}</span>
          <span>${formatDate(item.date)}</span>
          ${item.notes ? `<span>${item.notes}</span>` : ""}
        </div>
      </div>
      <div class="history-right">
        <div class="history-amount">${item.type === "expense" ? "-" : ""}${formatCurrency(item.amount).replace("-", "")}</div>
        <button class="action-btn" type="button" data-edit="${item.id}">Edit</button>
        <button class="action-btn delete" type="button" data-delete="${item.id}">Delete</button>
      </div>
    </article>
  `).join("");

  historyList.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => startEdit(button.dataset.edit));
  });

  historyList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteTransaction(button.dataset.delete));
  });
}

function drawPieChart() {
  const ctx = pieCanvas.getContext("2d");
  const expenses = currentUser.transactions.filter((item) => item.type === "expense");
  const totalsByCategory = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
    return acc;
  }, {});
  const entries = Object.entries(totalsByCategory);

  ctx.clearRect(0, 0, pieCanvas.width, pieCanvas.height);
  pieLegend.innerHTML = "";

  if (entries.length === 0) {
    ctx.fillStyle = "#8aa0b6";
    ctx.font = "14px Outfit";
    ctx.textAlign = "center";
    ctx.fillText("Add expense data to see category split", pieCanvas.width / 2, pieCanvas.height / 2);
    return;
  }

  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  let startAngle = -Math.PI / 2;
  const centerX = pieCanvas.width / 2;
  const centerY = pieCanvas.height / 2;
  const radius = Math.min(pieCanvas.width, pieCanvas.height) * 0.38;

  entries.forEach(([category, amount]) => {
    const sliceAngle = (amount / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = categoryPalette[category] || categoryPalette.Other;
    ctx.fill();
    startAngle += sliceAngle;
  });

  if (entries.length === 1) {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  entries.forEach(([category]) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-swatch" style="background:${categoryPalette[category] || categoryPalette.Other}"></span>${category}`;
    pieLegend.appendChild(item);
  });
}

function drawLineChart() {
  const ctx = lineCanvas.getContext("2d");
  ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
  lineLegend.innerHTML = `<div class="legend-item"><span class="legend-swatch" style="background:#6c79ff"></span>total</div>`;

  const grouped = currentUser.transactions.reduce((acc, item) => {
    const key = item.date.slice(0, 7);
    acc[key] = (acc[key] || 0) + Number(item.amount);
    return acc;
  }, {});

  const points = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  if (points.length === 0) {
    ctx.fillStyle = "#8aa0b6";
    ctx.font = "14px Outfit";
    ctx.textAlign = "center";
    ctx.fillText("Add transactions to view monthly totals", lineCanvas.width / 2, lineCanvas.height / 2);
    return;
  }

  const values = points.map(([, value]) => value);
  const maxValue = Math.max(...values, 100);
  const padding = { top: 16, right: 18, bottom: 34, left: 36 };
  const chartWidth = lineCanvas.width - padding.left - padding.right;
  const chartHeight = lineCanvas.height - padding.top - padding.bottom;

  ctx.strokeStyle = "#d1dbe6";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(lineCanvas.width - padding.right, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = "#8ea2b6";
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, lineCanvas.height - padding.bottom);
  ctx.lineTo(lineCanvas.width - padding.right, lineCanvas.height - padding.bottom);
  ctx.stroke();

  const positions = points.map(([label, value], index) => {
    const x = padding.left + (chartWidth * index) / Math.max(points.length - 1, 1);
    const y = padding.top + chartHeight - (value / maxValue) * (chartHeight - 10);
    return { label, x, y };
  });

  ctx.strokeStyle = "#6c79ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  positions.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  positions.forEach((point) => {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#6c79ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#47627e";
    ctx.font = "11px Outfit";
    ctx.textAlign = "center";
    ctx.fillText(point.label, point.x, lineCanvas.height - 10);
  });

  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i += 1) {
    const ratio = 1 - i / 4;
    const value = Math.round(maxValue * ratio);
    const y = padding.top + (chartHeight / 4) * i + 4;
    ctx.fillStyle = "#47627e";
    ctx.font = "11px Outfit";
    ctx.fillText(String(value), padding.left - 6, y);
  }
}

function refreshDashboard() {
  signedInName.textContent = currentUser.name;
  populateCategoryFilter();
  updateSummary();
  renderHistory();
  drawPieChart();
  drawLineChart();
}
function handleTransactionSubmit(event) {
  event.preventDefault();

  const payload = {
    id: editingTransactionId || safeUUID(),
    title: document.getElementById("titleInput").value.trim(),
    amount: Number(document.getElementById("amountInput").value),
    category: document.getElementById("categoryInput").value,
    type: document.getElementById("typeInput").value,
    date: document.getElementById("dateInput").value,
    notes: document.getElementById("notesInput").value.trim()
  };

  if (!payload.title || !payload.date || payload.amount <= 0) {
    alert("Please fill all required fields with a valid amount.");
    return;
  }

  updateCurrentUserRecord((user) => {
    if (editingTransactionId) {
      user.transactions = user.transactions.map((item) => item.id === editingTransactionId ? payload : item);
    } else {
         user.transactions.push(payload);
    }
    return user;
  });

  resetForm();
  refreshDashboard();
}

function startEdit(id) {
  const transaction = currentUser.transactions.find((item) => item.id === id);
  if (!transaction) return;

  editingTransactionId = id;
  document.getElementById("formTitle").textContent = "Edit transaction";
  document.getElementById("transactionId").value = transaction.id;
  document.getElementById("titleInput").value = transaction.title;
  document.getElementById("amountInput").value = transaction.amount;
  document.getElementById("categoryInput").value = transaction.category;
  document.getElementById("typeInput").value = transaction.type;
  document.getElementById("dateInput").value = transaction.date;
  document.getElementById("notesInput").value = transaction.notes || "";
  window.scrollTo({ top: document.querySelector(".workspace-grid").offsetTop - 20, behavior: "smooth" });
}

function deleteTransaction(id) {
  updateCurrentUserRecord((user) => {
    user.transactions = user.transactions.filter((item) => item.id !== id);
    return user;
  });

  if (editingTransactionId === id) resetForm();
  refreshDashboard();
}

function resetForm() {
  editingTransactionId = null;
  document.getElementById("formTitle").textContent = "Add a transaction";
  document.getElementById("transactionForm").reset();
  document.getElementById("dateInput").value = "2026-04-05";
}

function attachDashboardEvents() {
  document.getElementById("transactionForm").addEventListener("submit", handleTransactionSubmit);
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    currentUser = null;
    authMode = "login";
    render();
  });

  ["searchFilter", "typeFilter", "categoryFilter", "monthFilter"].forEach((id) => {
    const element = document.getElementById(id);
    element.addEventListener("input", renderHistory);
    element.addEventListener("change", renderHistory);
  });

  document.getElementById("resetFiltersBtn").addEventListener("click", () => {
    document.getElementById("searchFilter").value = "";
    document.getElementById("typeFilter").value = "all";
    document.getElementById("categoryFilter").value = "all";
    document.getElementById("monthFilter").value = "";
    renderHistory();
  });
}

function render() {
  if (!currentUser) {
    dashboardView.classList.add("hidden");
    authView.classList.remove("hidden");
    renderAuth();
    return;
  }

  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  resetForm();
  attachDashboardEvents();
  refreshDashboard();
}

seedDemoUser();
render();
