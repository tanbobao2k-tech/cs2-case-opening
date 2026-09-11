// Logic Quản Trị Viên (Admin Dashboard) — Mở Hòm CS2
const API_URL = "https://cs2-case-api.tanbobao2k.workers.dev";
const ADMIN_TOKEN_KEY = "cs2-admin-token";

let currentAdminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
let allUsersCache = [];
let allTopupsCache = [];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// Định dạng tiền tệ
const fmtUSD = (v) => "$" + (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVND = (v) => (Number(v) || 0).toLocaleString("vi-VN") + "₫";
const fmtTime = (ts) => {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  } catch {
    return String(ts);
  }
};

// Hiển thị thông báo Toast
let toastTimer = null;
function showToast(msg) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// Gọi API với Admin Header
async function adminFetch(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${currentAdminToken}`,
    "X-Admin-Key": currentAdminToken,
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    currentAdminToken = "";
    showLockScreen();
    throw new Error("Phiên quản trị viên đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}

// ----------------------------------------------------
// QUẢN LÝ ĐĂNG NHẬP / KHÓA MÀN HÌNH
// ----------------------------------------------------
function showLockScreen() {
  const lock = $("#admin-lock-screen");
  if (lock) {
    lock.hidden = false;
    lock.style.display = "flex";
  }
  const passInput = $("#admin-password-input");
  if (passInput) {
    passInput.value = "";
    passInput.focus();
  }
}

function hideLockScreen() {
  const lock = $("#admin-lock-screen");
  if (lock) {
    lock.hidden = true;
    lock.style.display = "none";
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const passInput = $("#admin-password-input");
  const errEl = $("#admin-login-err");
  const submitBtn = $("#admin-login-submit");
  const pass = passInput.value.trim();

  if (!pass) return;

  errEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "⏳ Đang xác thực...";

  try {
    const res = await fetch(`${API_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Mật khẩu không chính xác.");
    }

    currentAdminToken = data.token || pass;
    localStorage.setItem(ADMIN_TOKEN_KEY, currentAdminToken);
    hideLockScreen();
    showToast("🎉 Đăng nhập Quản Trị Viên thành công!");
    loadDashboard();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
    passInput.focus();
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "🔓 Đăng Nhập Quản Trị";
  }
}

function handleAdminLogout() {
  if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi trang Quản Trị?")) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    currentAdminToken = "";
    showLockScreen();
    showToast("Đã đăng xuất quản trị.");
  }
}

// ----------------------------------------------------
// TẢI DỮ LIỆU DASHBOARD
// ----------------------------------------------------
async function loadDashboard() {
  await Promise.allSettled([
    loadStats(),
    loadUsers(),
    loadTopups(),
  ]);
}

// 1. Thống kê KPI
async function loadStats() {
  try {
    const data = await adminFetch("/admin/stats");
    $("#stat-total-users").textContent = (data.totalUsers || 0).toLocaleString("vi-VN");
    $("#stat-active-users").textContent = (data.activeUsers || 0).toLocaleString("vi-VN");
    $("#stat-pending-users").textContent = (data.pendingUsers || 0).toLocaleString("vi-VN");
    $("#stat-sessions").textContent = (data.totalSessions || 0).toLocaleString("vi-VN");
    $("#stat-economy").textContent = fmtUSD(data.totalWorth || 0);
    $("#stat-pending-topups").textContent = (data.pendingTopups || 0).toLocaleString("vi-VN");

    const badge = $("#tab-topup-badge");
    if (badge) {
      if (data.pendingTopups > 0) {
        badge.textContent = data.pendingTopups;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }
  } catch (err) {
    console.error("loadStats error:", err);
  }
}

// 2. Danh sách Người Dùng
async function loadUsers() {
  const tbody = $("#users-table-body");
  const q = ($("#user-search")?.value || "").trim();
  const status = $("#user-status-filter")?.value || "all";

  try {
    const url = `/admin/users?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`;
    const data = await adminFetch(url);
    allUsersCache = data.users || [];
    renderUsersTable(allUsersCache);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--danger); padding: 24px;">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}

function renderUsersTable(users) {
  const tbody = $("#users-table-body");
  const countLabel = $("#users-count-label");
  if (countLabel) countLabel.textContent = `Đang hiển thị ${users.length} tài khoản`;

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px;">Không tìm thấy tài khoản nào phù hợp.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  users.forEach((u) => {
    const tr = document.createElement("tr");

    // Status badge
    let statusBadge = "";
    if (u.status === "active") {
      statusBadge = '<span class="status-badge active">🟢 Hoạt động</span>';
    } else if (u.status === "pending") {
      statusBadge = '<span class="status-badge pending">⏳ Chờ duyệt</span>';
    } else if (u.status === "rejected") {
      statusBadge = '<span class="status-badge rejected">🔴 Bị khóa</span>';
    } else {
      statusBadge = '<span class="status-badge active">🟢 Hoạt động</span>';
    }

    // Sessions info
    const isOnline = u.sessionCount > 0;
    const sessionInfo = isOnline
      ? `<span style="color: var(--success); font-weight: 600;">⚡ ${u.sessionCount} phiên online</span>`
      : `<span style="color: var(--text-muted);">Offline (${fmtTime(u.lastActive)})</span>`;

    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 11px;">#${u.id}</td>
      <td>
        <b style="color: #fff; font-size: 14px;">${u.name}</b>
      </td>
      <td>${statusBadge}</td>
      <td style="color: #00f5a0; font-weight: 700;">${fmtUSD(u.balance)}</td>
      <td>
        <div>${fmtUSD(u.worth - u.balance)}</div>
        <small style="color: var(--text-muted);">${u.invCount || 0} skin trong kho</small>
      </td>
      <td><b>${u.opened || 0}</b> hòm</td>
      <td>${sessionInfo}</td>
      <td style="color: var(--text-muted); font-size: 12px;">${fmtTime(u.created)}</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
          ${
            u.status === "pending"
              ? `<button type="button" class="btn btn-xs btn-success" data-act="approve" data-id="${u.id}" data-name="${u.name}">✔ Duyệt</button>`
              : ""
          }
          ${
            u.status === "rejected"
              ? `<button type="button" class="btn btn-xs btn-success" data-act="unban" data-id="${u.id}" data-name="${u.name}">🔓 Mở khóa</button>`
              : `<button type="button" class="btn btn-xs btn-warning" data-act="ban" data-id="${u.id}" data-name="${u.name}">🔒 Khóa</button>`
          }
          <button type="button" class="btn btn-xs" data-act="balance" data-id="${u.id}" data-name="${u.name}" data-bal="${u.balance}">💰 Nạp/Trừ</button>
          <button type="button" class="btn btn-xs" data-act="reset-pass" data-id="${u.id}" data-name="${u.name}">🔑 Đổi pass</button>
          <button type="button" class="btn btn-xs btn-danger" data-act="delete" data-id="${u.id}" data-name="${u.name}">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 3. Danh sách Yêu cầu Nạp tiền
async function loadTopups() {
  const tbody = $("#topups-table-body");
  try {
    const data = await adminFetch("/admin/topup-requests");
    allTopupsCache = data.requests || [];
    renderTopupsTable(allTopupsCache);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger); padding: 24px;">Lỗi tải yêu cầu nạp tiền: ${err.message}</td></tr>`;
  }
}

function renderTopupsTable(requests) {
  const tbody = $("#topups-table-body");
  if (!requests.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">Chưa có yêu cầu nạp tiền nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  requests.forEach((r) => {
    const tr = document.createElement("tr");

    let statusText = "";
    if (r.status === "pending") {
      statusText = '<span class="status-badge pending">⏳ Chờ duyệt</span>';
    } else if (r.status === "approved") {
      statusText = '<span class="status-badge active">✔ Đã duyệt</span>';
    } else {
      statusText = '<span class="status-badge rejected">✖ Đã từ chối</span>';
    }

    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 11px;">#${r.id}</td>
      <td><b style="color: #fff;">${r.user_name}</b></td>
      <td style="color: #00f5a0; font-weight: 700;">+${fmtUSD(r.amount)}</td>
      <td style="color: #ffd700;">${fmtVND(r.fee)}</td>
      <td><code style="background: #202736; padding: 2px 6px; border-radius: 4px; color: #00f5a0;">NAP ${r.user_name}</code></td>
      <td style="color: var(--text-muted); font-size: 12px;">${fmtTime(r.created)}</td>
      <td>${statusText}</td>
      <td style="text-align: right;">
        ${
          r.status === "pending"
            ? `
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn btn-xs btn-success" data-topup-act="approve" data-id="${r.id}" data-name="${r.user_name}">✔ Phê Duyệt</button>
            <button type="button" class="btn btn-xs btn-danger" data-topup-act="reject" data-id="${r.id}" data-name="${r.user_name}">✖ Từ Chối</button>
          </div>
        `
            : `<span style="font-size: 12px; color: var(--text-muted);">Đã xử lý</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ----------------------------------------------------
// THAO TÁC NGƯỜI DÙNG & NẠP TIỀN
// ----------------------------------------------------
document.addEventListener("click", async (e) => {
  // Thao tác với người dùng
  const actBtn = e.target.closest("[data-act]");
  if (actBtn) {
    const act = actBtn.dataset.act;
    const userId = Number(actBtn.dataset.id);
    const userName = actBtn.dataset.name;

    if (act === "approve") {
      try {
        await adminFetch("/admin/user-status", {
          method: "POST",
          body: JSON.stringify({ userId, status: "active" }),
        });
        showToast(`✔ Đã phê duyệt tài khoản "${userName}"!`);
        loadDashboard();
      } catch (err) {
        alert("Lỗi: " + err.message);
      }
    } else if (act === "ban") {
      if (confirm(`Bạn có chắc muốn KHÓA tài khoản "${userName}"? Người này sẽ bị đăng xuất ngay lập tức.`)) {
        try {
          await adminFetch("/admin/user-status", {
            method: "POST",
            body: JSON.stringify({ userId, status: "rejected" }),
          });
          showToast(`🔒 Đã khóa tài khoản "${userName}".`);
          loadDashboard();
        } catch (err) {
          alert("Lỗi: " + err.message);
        }
      }
    } else if (act === "unban") {
      try {
        await adminFetch("/admin/user-status", {
          method: "POST",
          body: JSON.stringify({ userId, status: "active" }),
        });
        showToast(`🔓 Đã mở khóa cho tài khoản "${userName}".`);
        loadDashboard();
      } catch (err) {
        alert("Lỗi: " + err.message);
      }
    } else if (act === "balance") {
      openBalanceModal(userId, userName, actBtn.dataset.bal);
    } else if (act === "reset-pass") {
      openResetPassModal(userId, userName);
    } else if (act === "delete") {
      const promptName = prompt(`⚠️ CẢNH BÁO: Hành động này sẽ XÓA VĨNH VIỄN tài khoản và toàn bộ kho đồ của "${userName}".\n\nNhập chính xác "${userName}" để xác nhận:`);
      if (promptName === userName) {
        try {
          await adminFetch("/admin/user", {
            method: "DELETE",
            body: JSON.stringify({ userId }),
          });
          showToast(`🗑️ Đã xóa vĩnh viễn tài khoản "${userName}".`);
          loadDashboard();
        } catch (err) {
          alert("Lỗi: " + err.message);
        }
      }
    }
  }

  // Thao tác với yêu cầu nạp tiền
  const topupBtn = e.target.closest("[data-topup-act]");
  if (topupBtn) {
    const action = topupBtn.dataset.topupAct;
    const reqId = Number(topupBtn.dataset.id);
    const userName = topupBtn.dataset.name;

    const actionText = action === "approve" ? "PHÊ DUYỆT (cộng $5.000)" : "TỪ CHỐI";
    if (confirm(`Bạn có chắc muốn ${actionText} yêu cầu nạp tiền của "${userName}"?`)) {
      try {
        await adminFetch("/admin/topup-action", {
          method: "POST",
          body: JSON.stringify({ requestId: reqId, action }),
        });
        showToast(`Đã ${action === "approve" ? "phê duyệt" : "từ chối"} đơn nạp của "${userName}" thành công!`);
        loadDashboard();
      } catch (err) {
        alert("Lỗi: " + err.message);
      }
    }
  }
});

// Modal Điều chỉnh Số Dư
function openBalanceModal(userId, userName, curBal) {
  $("#mb-user-id").value = userId;
  $("#mb-user-info").innerHTML = `Tài khoản: <b style="color:#fff;">${userName}</b> · Số dư hiện tại: <span style="color:#00f5a0; font-weight:700;">${fmtUSD(curBal)}</span>`;
  $("#mb-amount").value = "500";
  $("#modal-balance").hidden = false;
}

$("#mb-form").onsubmit = async (e) => {
  e.preventDefault();
  const userId = Number($("#mb-user-id").value);
  const mode = $("#mb-mode").value;
  const amt = Number($("#mb-amount").value);

  if (isNaN(amt) || amt < 0) return alert("Số tiền không hợp lệ!");

  let payload = { userId };
  if (mode === "delta-add") payload.delta = amt;
  else if (mode === "delta-sub") payload.delta = -amt;
  else if (mode === "set") payload.setBalance = amt;

  try {
    const res = await adminFetch("/admin/user-balance", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    closeAdminModal("#modal-balance");
    showToast(`💰 Đã cập nhật số dư mới: ${fmtUSD(res.balance)}!`);
    loadDashboard();
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
};

// Modal Đổi Mật Khẩu Cho User
function openResetPassModal(userId, userName) {
  $("#mrp-user-id").value = userId;
  $("#mrp-user-info").innerHTML = `Đặt lại mật khẩu cho tài khoản: <b style="color:#fff;">${userName}</b>`;
  $("#mrp-new-pass").value = "";
  $("#modal-reset-pass").hidden = false;
  setTimeout(() => $("#mrp-new-pass")?.focus(), 100);
}

$("#mrp-form").onsubmit = async (e) => {
  e.preventDefault();
  const userId = Number($("#mrp-user-id").value);
  const newPassword = $("#mrp-new-pass").value.trim();

  if (newPassword.length < 4) return alert("Mật khẩu mới tối thiểu 4 ký tự!");

  try {
    await adminFetch("/admin/user-reset-password", {
      method: "POST",
      body: JSON.stringify({ userId, newPassword }),
    });
    closeAdminModal("#modal-reset-pass");
    showToast(`🔑 Đã đổi mật khẩu cho người chơi thành công!`);
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
};

window.closeAdminModal = function (sel) {
  const m = $(sel);
  if (m) m.hidden = true;
};

// ----------------------------------------------------
// TABS & EVENT LISTENERS
// ----------------------------------------------------
$$(".tab-btn").forEach((btn) => {
  btn.onclick = () => {
    $$(".tab-btn").forEach((b) => b.classList.remove("active"));
    $$(".tab-content").forEach((c) => (c.hidden = true));
    btn.classList.add("active");
    const target = $("#" + btn.dataset.tab);
    if (target) target.hidden = false;
  };
});

// Tìm kiếm & Lọc người dùng
$("#user-search").oninput = () => {
  clearTimeout(window.searchTimer);
  window.searchTimer = setTimeout(loadUsers, 350);
};
$("#user-status-filter").onchange = loadUsers;

// Nút làm mới & Đăng xuất
$("#btn-refresh-all").onclick = () => {
  showToast("🔄 Đang làm mới dữ liệu...");
  loadDashboard();
};
$("#btn-admin-logout").onclick = handleAdminLogout;
$("#admin-login-form").onsubmit = handleAdminLogin;

// Khởi chạy khi load trang
if (currentAdminToken) {
  hideLockScreen();
  loadDashboard();
} else {
  showLockScreen();
}
