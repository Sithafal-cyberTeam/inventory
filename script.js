const API_BASE = "https://system-inventory-api.onrender.com/api";
const ACCESS_PASSWORD = "SecureAsset123"; // Default password

// DOM Elements
const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const logoutBtn = document.getElementById("logoutBtn");
const agentList = document.getElementById("agentList");
const refreshBtn = document.getElementById("refreshBtn");
const loader = document.getElementById("loader");
const errorMsg = document.getElementById("errorMsg");
const sidebarDate = document.getElementById("sidebarDate");
const welcomeSection = document.getElementById("welcomeSection");
const dashboardSection = document.getElementById("dashboardSection");
const statCards = document.getElementById("statCards");
const memChartCanvas = document.getElementById("memChart");
const driveChartCanvas = document.getElementById("driveChart");
const userChartCanvas = document.getElementById("userChart");

let memChart, driveChart, userChart;
let isAuthenticated = false;

// Utility functions
function showLoader() { loader.classList.remove("hidden"); }
function hideLoader() { loader.classList.add("hidden"); }

function showError(msg) {
  errorMsg.innerHTML = `<i class="ph-bold ph-warning"></i> ${msg}`;
  errorMsg.classList.remove("hidden");
  setTimeout(() => errorMsg.classList.add("hidden"), 5000);
}

function setDate() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  };
  sidebarDate.textContent = now.toLocaleString('en-US', options);
}

function asGB(bytes) {
  return bytes > 0 ? (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB" : "-";
}

function n(val) { return (val != null && val !== "") ? val : "-"; }

// Authentication
function checkAuth() {
  const storedAuth = localStorage.getItem('assetAuth');
  if (storedAuth && storedAuth === ACCESS_PASSWORD) {
    isAuthenticated = true;
    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");
    initApp();
  }
}

loginForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const password = passwordInput.value.trim();
  
  if (password === ACCESS_PASSWORD) {
    localStorage.setItem('assetAuth', password);
    isAuthenticated = true;
    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");
    initApp();
  } else {
    passwordInput.value = '';
    passwordInput.focus();
    showError('Invalid access password');
  }
});

logoutBtn.addEventListener('click', function() {
  localStorage.removeItem('assetAuth');
  isAuthenticated = false;
  app.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  passwordInput.value = '';
});

// Stat Cards
function renderStatCards(data) {
  statCards.innerHTML = `
    <div class="stat-card">
      <i class="ph-bold ph-monitor"></i>
      <span class="label">Hostname</span>
      <span class="value">${data["Host Name"] || data.agent_id || "-"}</span>
    </div>
    <div class="stat-card">
      <i class="ph-bold ph-cpu"></i>
      <span class="label">CPU</span>
      <span class="value">${(data.CPU && data.CPU.name) || data.Processor || "-"}</span>
    </div>
    <div class="stat-card">
      <i class="ph-bold ph-memory"></i>
      <span class="label">Total RAM</span>
      <span class="value">${asGB(data["Total RAM"] || 0)}</span>
    </div>
    <div class="stat-card">
      <i class="ph-bold ph-hard-drives"></i>
      <span class="label">Drives</span>
      <span class="value">${Array.isArray(data.Drives) ? data.Drives.length : "-"}</span>
    </div>
    <div class="stat-card">
      <i class="ph-bold ph-globe"></i>
      <span class="label">IP Address</span>
      <span class="value">${data["IP Address"] || "-"}</span>
    </div>
    <div class="stat-card">
      <i class="ph-bold ph-users"></i>
      <span class="label">Users</span>
      <span class="value">${(Array.isArray(data["OS Users"]) ? data["OS Users"].length : "-")}</span>
    </div>
  `;
}

// Tabular Sections
function renderSysTab(data) {
  return `
    <table class="section-table">
      <tr><th>Operating System</th><td>${n(data["Operating System"])}</td></tr>
      <tr><th>OS Version</th><td>${n(data["OS Version"])}</td></tr>
      <tr><th>Build Number</th><td>${n(data["OS Build Number"])}</td></tr>
      <tr><th>Architecture</th><td>${n(data["OS Architecture"])}</td></tr>
      <tr><th>Uptime</th><td>${n(data["Uptime"])}</td></tr>
      <tr><th>Last Boot Time</th><td>${n(data["Last Boot time"])}</td></tr>
      <tr><th>Language</th><td>${n(data["OS language"])}</td></tr>
      <tr><th>Status</th><td>${n(data["Status"])}</td></tr>
      <tr><th>Compliance</th><td>${n(data["Compliance Status"])}</td></tr>
      <tr><th>Last Update</th><td>${n(data["Last Update"]) ? new Date(data["Last Update"]).toLocaleString() : "-"}</td></tr>
    </table>
  `;
}

function renderHwTab(data) {
  return `
    <table class="section-table">
      <tr><th>Model</th><td>${n(data["Model"])}</td></tr>
      <tr><th>Manufacturer</th><td>${n(data["Manufacturer"])}</td></tr>
      <tr><th>Serial Number</th><td>${n(data["Serial Number"])}</td></tr>
      <tr><th>UUID</th><td>${n(data["UUID"])}</td></tr>
      <tr><th>BIOS Version</th><td>${n(data["BIOS Version"])}</td></tr>
      <tr><th>Motherboard</th><td>${n(data["Motherboard"])}</td></tr>
      <tr><th>Graphics</th><td>${Array.isArray(data.Graphics) ? data.Graphics.join(", ") : "-"}</td></tr>
      <tr><th>Audio</th><td>${Array.isArray(data.Audio) ? data.Audio.join(", ") : "-"}</td></tr>
      <tr><th>Total RAM</th><td>${asGB(data["Total RAM"])}</td></tr>
      <tr><th>Free RAM</th><td>${asGB(data["Free RAM"])}</td></tr>
      <tr><th>Processor</th><td>${n(data["Processor"])}</td></tr>
      <tr><th>Physical Cores</th><td>${n(data["Processor Cores"] || data["Processor Count"])}</td></tr>
      <tr><th>Logical Cores</th><td>${n(data["Logical Processor Count"])}</td></tr>
    </table>
  `;
}

function renderNetTab(data) {
  const adapters = Array.isArray(data["Network Adapters"]) ? data["Network Adapters"] : [];
  
  return `
    <table class="section-table">
      <tr><th>MAC Address</th><td>${data["MAC Address"] || "-"}</td></tr>
      <tr><th>IP Address</th><td>${data["IP Address"] || "-"}</td></tr>
      <tr><th>DNS Hostnames</th><td>${Array.isArray(data["DNS HostNames"]) ? data["DNS HostNames"].join(", ") : "-"}</td></tr>
      <tr><th>Firewall Status</th><td>${n(data["Firewall Status"])}</td></tr>
      <tr><th>Defender Status</th><td>${n(data["Defender Status"])}</td></tr>
    </table>
    <div style="margin-top: 20px;">
      <h4 style="margin-bottom: 12px; color: var(--text-light);">Network Adapters</h4>
      <table class="section-table">
        <thead>
          <tr><th>Name</th><th>MAC</th><th>IP</th></tr>
        </thead>
        <tbody>
          ${adapters.map(n => `
            <tr>
              <td>${n.name || n.Description || "-"}</td>
              <td>${n.mac_address || n.MACAddress || "-"}</td>
              <td>${n.ip_address || n.IPAddress || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSwTab(data) {
  const software = Array.isArray(data.Software) ? data.Software : [];
  
  if (software.length === 0) return "<div class='no-data'>No software information available</div>";
  
  return `
    <div class="software-grid">
      ${software.slice(0, 25).map(app => `
        <div class="software-item">
          <div class="app-icon"><i class="ph-bold ph-app-window"></i></div>
          <div class="app-details">
            <div class="app-name">${app.name || app.DisplayName || "Unknown Application"}</div>
            <div class="app-meta">
              <span>${app.version || app.DisplayVersion || "No version"}</span>
              ${app.Publisher ? `<span>${app.Publisher}</span>` : ''}
              ${app.InstallDate ? `<span>${app.InstallDate}</span>` : ''}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderUsrTab(data) {
  const admins = Array.isArray(data["Local Admins"]) ? data["Local Admins"] : [];
  const users = Array.isArray(data["OS Users"]) ? data["OS Users"] : [];
  const userDetails = data["User Details"] || {};
  
  return `
    <table class="section-table">
      <tr><th>Local Admins</th><td>${admins.join(", ") || "-"}</td></tr>
      <tr><th>All Users</th><td>${users.join(", ") || "-"}</td></tr>
      <tr><th>Account Name</th><td>${userDetails['SAMAccountName'] || "-"}</td></tr>
      <tr><th>Display Name</th><td>${userDetails['DisplayName'] || "-"}</td></tr>
      <tr><th>Status</th><td>${userDetails['Status'] || "-"}</td></tr>
      <tr><th>Groups</th><td>${Array.isArray(userDetails.Groups) ? userDetails.Groups.join(", ") : "-"}</td></tr>
    </table>
  `;
}

// Charts
function renderCharts(data) {
  // Destroy existing charts
  if (memChart) memChart.destroy();
  if (driveChart) driveChart.destroy();
  if (userChart) userChart.destroy();
  
  // Memory chart
  const memTotal = data["Total RAM"] / 1024 / 1024 / 1024;
  const memUsed = memTotal - (data["Free RAM"] / 1024 / 1024 / 1024);
  
  memChart = new Chart(memChartCanvas, {
    type: "doughnut",
    data: {
      labels: ["Used", "Free"],
      datasets: [{
        data: [memUsed, memTotal - memUsed],
        backgroundColor: ["#4361ee", "#06d6a0"],
        borderWidth: 0
      }]
    },
    options: {
      cutout: "70%",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw.toFixed(2)} GB`
          }
        }
      }
    }
  });
  
  // Drive chart
  const drives = Array.isArray(data.Drives) ? data.Drives : [];
  const driveLabels = drives.map(d => d.device || d.Device || "Drive");
  const driveData = drives.map(d => (d.used || 0) / 1024 / 1024 / 1024);
  
  driveChart = new Chart(driveChartCanvas, {
    type: "bar",
    data: {
      labels: driveLabels,
      datasets: [{
        label: "Used Space (GB)",
        data: driveData,
        backgroundColor: "#4361ee",
        borderRadius: 6
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
  
  // User chart
  const allUsers = Array.isArray(data["OS Users"]) ? data["OS Users"] : [];
  const adminUsers = Array.isArray(data["Local Admins"]) ? data["Local Admins"] : [];
  
  userChart = new Chart(userChartCanvas, {
    type: "pie",
    data: {
      labels: ["Admins", "Standard Users"],
      datasets: [{
        data: [adminUsers.length, Math.max(allUsers.length - adminUsers.length, 0)],
        backgroundColor: ["#ff6b6b", "#4361ee"],
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

// Data Fetching
async function loadAgents() {
  showLoader();
  errorMsg.classList.add("hidden");
  agentList.innerHTML = `<option disabled selected>Loading agents...</option>`;
  
  try {
    const res = await fetch(`${API_BASE}/reports`);
    const data = await res.json();
    
    agentList.innerHTML = `<option disabled selected>Select an agent</option>`;
    
    data.forEach(agent => {
      const host = agent["Host Name"] || agent.agent_id || "Unknown Host";
      const opt = document.createElement("option");
      opt.value = agent.agent_id;
      opt.textContent = host;
      agentList.appendChild(opt);
    });
  } catch (err) {
    showError("Failed to load agent list. Please try again.");
  }
  
  hideLoader();
}

async function fetchAgent(agentId) {
  if (!agentId) return;
  
  showLoader();
  errorMsg.classList.add("hidden");
  
  try {
    const res = await fetch(`${API_BASE}/report/${agentId}`);
    if (!res.ok) throw new Error("Agent data not found");
    
    const data = await res.json();
    renderDashboard(data);
  } catch (err) {
    showError("Failed to load agent data. Please try again.");
    dashboardSection.classList.add("hidden");
    welcomeSection.classList.remove("hidden");
  }
  
  hideLoader();
}

function renderDashboard(data) {
  dashboardSection.classList.remove("hidden");
  welcomeSection.classList.add("hidden");
  
  renderStatCards(data);
  
  // Render tab content
  document.querySelector('[data-panel="sys"]').innerHTML = renderSysTab(data);
  document.querySelector('[data-panel="hw"]').innerHTML = renderHwTab(data);
  document.querySelector('[data-panel="net"]').innerHTML = renderNetTab(data);
  document.querySelector('[data-panel="sw"]').innerHTML = renderSwTab(data);
  document.querySelector('[data-panel="usr"]').innerHTML = renderUsrTab(data);
  
  // Render charts
  renderCharts(data);
}

// Tab Navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active tab button
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show corresponding panel
      const tabName = btn.dataset.tab;
      const panels = document.querySelectorAll('.tab-panel');
      
      panels.forEach(panel => {
        panel.classList.add('hidden');
        if (panel.dataset.panel === tabName) {
          panel.classList.remove('hidden');
        }
      });
    });
  });
}

// Initialize Application
function initApp() {
  setDate();
  setInterval(setDate, 60000); // Update time every minute
  
  refreshBtn.addEventListener('click', loadAgents);
  
  agentList.addEventListener('change', () => {
    if (agentList.value) {
      fetchAgent(agentList.value);
    }
  });
  
  setupTabNavigation();
  loadAgents();
}

// Initialize authentication check on load
document.addEventListener('DOMContentLoaded', checkAuth);


document.querySelectorAll('.sidebar-nav li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-nav li').forEach(e => e.classList.remove('active'));
    li.classList.add('active');

    let label = li.textContent.trim();

    // Toggle sections
    if (label === "Dashboard") {
      document.getElementById("dashboardSection").classList.remove("hidden");
      document.getElementById("assetsSection").classList.add("hidden");
    } else if (label === "Asset List") {
      document.getElementById("dashboardSection").classList.add("hidden");
      document.getElementById("assetsSection").classList.remove("hidden");

      // You can reuse same fetch or build asset list below
      loadAssetsToGrid();
    }
  });
});

// Simple mock to load dummy assets for now
function loadAssetsToGrid() {
  const grid = document.getElementById("assetListGrid");
  grid.innerHTML = "";
  for (let i = 1; i <= 6; i++) {
    grid.innerHTML += `
      <div class="software-item">
        <div class="app-icon"><i class="ph-bold ph-desktop"></i></div>
        <div class="app-details">
          <div class="app-name">Asset ${i}</div>
          <div class="app-meta">
            <span>SN: ASSET${1000 + i}</span>
            <span>Manufacturer: Dell</span>
          </div>
        </div>
      </div>
    `;
  }
}
