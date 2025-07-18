const form = document.getElementById("agent-form");
const input = document.getElementById("agentId");
const loader = document.getElementById("loader");
const dashboard = document.getElementById("inventory");
const error = document.getElementById("error-message");

const API_BASE = "https://system-inventory-api.onrender.com/api/report/";

function asGB(bytes) {
  return (bytes / (1024 ** 3)).toFixed(2) + " GB";
}
function prettify(val) {
  if (val === null || val === undefined || val === "") return "-";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return Array.isArray(val) ? val.join(", ") : val;
}
function toTable(obj, filterKeys=[]) {
  if (!obj || typeof obj !== 'object') return "";
  let out = '<table class="details-table">';
  for (const k in obj) {
    if (filterKeys.includes(k)) continue;
    out += `<tr><th>${k}</th><td>${prettify(obj[k])}</td></tr>`;
  }
  out += "</table>";
  return out;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const agentId = input.value.trim();
  if (!agentId) return;
  loader.classList.remove("hidden");
  dashboard.classList.add("hidden");
  error.classList.add("hidden");
  dashboard.innerHTML = "";

  try {
    const res = await fetch(API_BASE + encodeURIComponent(agentId));
    if (!res.ok) throw new Error("Agent not found");
    const d = await res.json();

    // Asset & System
    let assetInfo = [
      ["Asset ID", d["Asset ID"]],
      ["Host Name", d["Host Name"] || d.agent_id],
      ["Location", d["Location"] || "-"],
      ["Status", d["Status"] || "-"],
      ["Model", d["Model"]],
      ["Serial Number", d["Serial Number"]],
      ["Product Number", d["Product Number"]],
      ["UUID", d["UUID"]],
      ["Manufacturer", d["Manufacturer"]],
      ["Domain", d["Domain"]],
      ["Work Group", d["Work Group"]],
    ];
    let osInfo = [
      ["Operating System", d["Operating System"]],
      ["OS Version", d["OS Version"]],
      ["OS Build Number", d["OS Build Number"]],
      ["OS Installed Date", d["OS Installed Date"]],
      ["Last Boot time", d["Last Boot time"]],
      ["Uptime", d["Uptime"]],
      ["Architecture", d["OS Architecture"]],
      ["Language", d["OS language"]],
      ["Platform", d["platform"] || "-"],
      ["BIOS Version", d["BIOS Version"]],
      ["BIOS Release Date", d["BIOS Release Date"]],
      ["SM BIOS Version", d["SM BIOS Version"]],
      ["Motherboard", d["Motherboard"]],
      ["Firewall Status", d["Firewall Status"]],
      ["Gatekeeper Status", d["Gatekeeper Status"]],
      ["SIP Status", d["SIP Status"]],
      ["Hypervisor Present", d["Hypervisor Present"]],
      ["Virtualization Enabled", prettify(d["Virtualization Enabled"])],
    ];
    let cpuInfo = [
      ["CPU Name", (d.CPU && d.CPU.name) || d["Processor"] || "-"],
      ["Physical Cores", (d.CPU && d.CPU.cores) || d["Processor Count"] || "-"],
      ["Logical Processors", (d.CPU && d.CPU.logical_processors) || d["Logical Processor Count"] || "-"],
      ["Processor Cores", d["Processor Cores"]],
    ];
    let memInfo = [
      ["Total RAM", asGB(d["Total RAM"] || (d.memory && d.memory.total) || 0)],
      ["Free RAM", asGB(d["Free RAM"] || (d.memory && d.memory.free) || 0)]
    ];
    let netInfo = [
      ["MAC Address", d["MAC Address"]],
      ["IP Address", d["IP Address"]],
      ["DNS Hostnames", prettify(d["DNS HostNames"])]
    ];

    // List tables
    let software = Array.isArray(d.Software)
      ? d.Software.map(s =>
        `<div class="software-entry">
          <b>${s.name || s.DisplayName || "App"}</b>
          <span class="value-small">${s.version || s.DisplayVersion || ""} ${s.bundle_id ? "("+s.bundle_id+")" : ""} ${s.Publisher ? "- "+s.Publisher : ""} ${s.InstallDate? "Installed: " + s.InstallDate : ""}</span>
        </div>`
      ).join("") : "<i>No software info</i>";

    let diskTable = Array.isArray(d.Drives)
      ? d.Drives.map(dv =>
        `<tr>
          <td>${dv.device || dv.Device}</td>
          <td>${dv.mountpoint || dv.Mountpoint || dv.Mount || "-"}</td>
          <td>${dv.fstype || "-"}</td>
          <td>${dv.total ? asGB(dv.total) : "-"}</td>
          <td>${dv.used ? asGB(dv.used) : "-"}</td>
          <td>${dv.free ? asGB(dv.free) : "-"}</td>
        </tr>`
      ).join("") : "";
    
    let users = Array.isArray(d["OS Users"])
      ? d["OS Users"].join(", ")
      : prettify(d["OS Users"]);

    let admins = Array.isArray(d["Local Admins"])
      ? d["Local Admins"].join(", ")
      : prettify(d["Local Admins"]);

    let adapters = Array.isArray(d["Network Adapters"])
      ? d["Network Adapters"].map(na =>
        `<li>${na.name || na.Description || "-"} [${na.device || na.Device || ""}] — MAC: <b>${na.mac_address || na.MACAddress || ""}</b>, IP: <b>${na.ip_address || na.IPAddress || ""}</b></li>`
      ).join("") : prettify(d["Network Adapters"]);

    // User Details
    let usrd = d["User Details"] || {};
    let userDetailsTable = toTable(usrd, ["Groups", "Roles", "Assigned Licenses", "Location"]);
    let userGroups = usrd.Groups ? usrd.Groups.join(", ") : "-";

    // Assemble HTML
    dashboard.innerHTML = `
      <div class="section asset-col">
        <h2>Asset / Device Information</h2>
        <table class="details-table">${assetInfo.map(([l,v])=>`<tr><th>${l}</th><td>${prettify(v)}</td></tr>`).join("")}</table>
      </div>
      <div class="section">
        <h2>Operating System & System Info</h2>
        <table class="details-table">${osInfo.map(([l,v])=>`<tr><th>${l}</th><td>${prettify(v)}</td></tr>`).join("")}</table>
      </div>
      <div class="section">
        <h2>CPU & Memory</h2>
        <table class="details-table">${cpuInfo.map(([l,v])=>`<tr><th>${l}</th><td>${prettify(v)}</td></tr>`).join("")}
          ${memInfo.map(([l,v])=>`<tr><th>${l}</th><td>${prettify(v)}</td></tr>`).join("")}
        </table>
      </div>
      <div class="section">
        <h2>Network</h2>
        <table class="details-table">
          ${netInfo.map(([l,v])=>`<tr><th>${l}</th><td>${prettify(v)}</td></tr>`).join("")}
        </table>
        <ul>${adapters}</ul>
      </div>
      <div class="section">
        <h2>Storage / Drives</h2>
        <table class="details-table">
          <tr><th>Device</th><th>Mount</th><th>Type</th><th>Total</th><th>Used</th><th>Free</th></tr>
          ${diskTable}
        </table>
      </div>
      <div class="section">
        <h2>User & Security</h2>
        <table class="details-table">
          <tr><th>Local Admins</th><td>${admins}</td></tr>
          <tr><th>OS Users</th><td>${users}</td></tr>
          <tr><th>User Groups</th><td>${userGroups}</td></tr>
        </table>
        <h3>User Details</h3>
        ${userDetailsTable}
      </div>
      <div class="section">
        <h2>Installed Software</h2>
        <div class="software-list">${software}</div>
      </div>
      <div class="section">
        <h2>Status & Compliance</h2>
        <table class="details-table">
          <tr><th>Compliance Status</th><td>${prettify(d["Compliance Status"])}</td></tr>
          <tr><th>Entitled User</th><td>${prettify(d["Entitled User"])}</td></tr>
          <tr><th>License Key</th><td>${prettify(d["License Key"])}</td></tr>
          <tr><th>Last Patch Date</th><td>${prettify(d["Last Patch Date"])}</td></tr>
          <tr><th>Last Update</th><td>${prettify(d["Last Update"])}</td></tr>
        </table>
      </div>
    `;
    dashboard.classList.remove("hidden");
  } catch (err) {
    error.textContent = err.message;
    error.classList.remove("hidden");
  } finally {
    loader.classList.add("hidden");
  }
});
