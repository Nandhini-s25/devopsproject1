const STORAGE_KEYS = {
  users: "expense-manager-users",
  currentUser: "expense-manager-current-user"
};

// ✅ ID GENERATOR (FIX)
function generateId() {
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

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
    id: generateId(), // ✅ FIXED
    name: "Nandhini S",
    email: "demo@example.com",
    password: "demo123",
    transactions: [
      {
        id: generateId(), // ✅ FIXED
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
      id: generateId(), // ✅ FIXED
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
      alert("Invalid email or password.");
      return;
    }
    saveCurrentUser(user);
  }

  render();
}

function handleTransactionSubmit(event) {
  event.preventDefault();

  const payload = {
    id: editingTransactionId || generateId(), // ✅ FIXED
    title: document.getElementById("titleInput").value.trim(),
    amount: Number(document.getElementById("amountInput").value),
    category: document.getElementById("categoryInput").value,
    type: document.getElementById("typeInput").value,
    date: document.getElementById("dateInput").value,
    notes: document.getElementById("notesInput").value.trim()
  };

  updateCurrentUserRecord((user) => {
    if (editingTransactionId) {
      user.transactions = user.transactions.map((item) =>
        item.id === editingTransactionId ? payload : item
      );
    } else {
      user.transactions.push(payload);
    }
    return user;
  });

  resetForm();
  render();
}

function resetForm() {
  editingTransactionId = null;
  document.getElementById("transactionForm")?.reset();
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
}

seedDemoUser();
render();