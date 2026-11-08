// ==============================
// 時計
// ==============================
const dateEl = document.getElementById("todayDate");
const timeEl = document.getElementById("currentTime");

function updateClock() {
  const now = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  dateEl.textContent =
    `${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}）`;

  timeEl.textContent = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(now);

  renderSchedule();
}

updateClock();
setInterval(updateClock, 15000);


// ==============================
// PWAインストール
// ==============================
let installPrompt = null;
const installButton = document.getElementById("installButton");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;

  installPrompt.prompt();
  await installPrompt.userChoice;

  installPrompt = null;
  installButton.hidden = true;
});


// ==============================
// Service Worker
// ==============================
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
  });
}


// ==============================
// 予定管理
// ==============================
const STORAGE_KEY = "elderly-support-schedules-v1";
const SWITCH_KEY = "elderly-support-switch-time-v1";

const scheduleList = document.getElementById("scheduleList");
const scheduleHeading = document.getElementById("scheduleHeading");
const dialog = document.getElementById("scheduleDialog");
const dialogContent = document.getElementById("scheduleDialogContent");

const scheduleForm = document.getElementById("scheduleForm");
const scheduleId = document.getElementById("scheduleId");
const scheduleDate = document.getElementById("scheduleDate");
const scheduleTime = document.getElementById("scheduleTime");
const scheduleTitle = document.getElementById("scheduleTitle");
const scheduleDetails = document.getElementById("scheduleDetails");

let schedules = loadSchedules();

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadSchedules() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("予定データの読み込みに失敗しました", error);
    }
  }

  // 初回起動時のサンプル予定
  const today = dateKey(new Date());

  return [
    {
      id: crypto.randomUUID(),
      date: today,
      time: "10:00",
      title: "デイサービス",
      details: "10時からデイサービスに出発します。",
      done: false
    },
    {
      id: crypto.randomUUID(),
      date: today,
      time: "14:00",
      title: "訪問介護",
      details: "ヘルパーさんが訪問します。",
      done: false
    },
    {
      id: crypto.randomUUID(),
      date: today,
      time: "16:30",
      title: "家族から電話",
      details: "娘から電話があります。",
      done: false
    }
  ];
}

function saveSchedules() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function getSwitchTime() {
  return localStorage.getItem(SWITCH_KEY) || "18:00";
}

function getDisplayDate() {
  const now = new Date();
  const today = dateKey(now);

  const todaySchedules = schedules.filter(item =>
    item.date === today
  );

  const allDone = todaySchedules.length > 0 &&
    todaySchedules.every(item => item.done);

  const currentTime =
    `${String(now.getHours()).padStart(2, "0")}:` +
    `${String(now.getMinutes()).padStart(2, "0")}`;

  if (allDone || currentTime >= getSwitchTime()) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateKey(tomorrow);
  }

  return today;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}


// ==============================
// 通常画面の予定表示
// ==============================
function renderSchedule() {
  const displayDate = getDisplayDate();
  const today = dateKey(new Date());

  const isTomorrow = displayDate !== today;

  scheduleHeading.textContent =
    isTomorrow ? "明日の予定" : "今日の予定";

  const items = schedules
    .filter(item => item.date === displayDate)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 3);

  scheduleList.innerHTML = "";

  if (items.length === 0) {
    scheduleList.innerHTML =
      '<p class="schedule-empty">予定はありません</p>';
    return;
  }

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "schedule-row" +
      (item.done ? " schedule-done" : "");

    row.innerHTML = `
      <time>${escapeHTML(item.time)}</time>
      <span>${escapeHTML(item.title)}</span>
    `;

    row.addEventListener("click", () => {
      openScheduleDialog();
    });

    scheduleList.appendChild(row);
  });
}


// ==============================
// 管理画面
// ==============================
function openScheduleDialog() {
  renderScheduleManager();

  document.getElementById("switchTime").value = getSwitchTime();

  dialog.showModal();
}

function renderScheduleManager() {
  const sorted = [...schedules].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );

  dialogContent.innerHTML = "";

  if (sorted.length === 0) {
    dialogContent.innerHTML = "<p>登録された予定はありません。</p>";
    return;
  }

  sorted.forEach(item => {
    const div = document.createElement("div");
    div.className = "schedule-item";

    div.innerHTML = `
      <strong>${escapeHTML(item.date)} ${escapeHTML(item.time)}</strong>
      <p>${escapeHTML(item.title)}</p>
      <p>${escapeHTML(item.details || "")}</p>
      <p>${item.done ? "終了済み" : "未終了"}</p>
      <div class="schedule-item-actions">
        <button type="button" data-action="done" data-id="${escapeHTML(item.id)}">
          ${item.done ? "未終了に戻す" : "終了"}
        </button>
        <button type="button" data-action="edit" data-id="${escapeHTML(item.id)}">
          編集
        </button>
        <button type="button" data-action="delete" data-id="${escapeHTML(item.id)}">
          削除
        </button>
      </div>
    `;

    dialogContent.appendChild(div);
  });
}

document.getElementById("scheduleManageButton")
  .addEventListener("click", openScheduleDialog);

document.getElementById("closeScheduleDialog")
  .addEventListener("click", () => dialog.close());


// ==============================
// 予定の終了・編集・削除
// ==============================
dialogContent.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  const item = schedules.find(item => item.id === id);
  if (!item) return;

  if (action === "done") {
    item.done = !item.done;
  }

  if (action === "edit") {
    scheduleId.value = item.id;
    scheduleDate.value = item.date;
    scheduleTime.value = item.time;
    scheduleTitle.value = item.title;
    scheduleDetails.value = item.details || "";

    document.getElementById("scheduleFormHeading").textContent =
      "予定を編集";
  }

  if (action === "delete") {
    if (!confirm("この予定を削除しますか？")) return;

    schedules = schedules.filter(item => item.id !== id);
  }

  saveSchedules();
  renderScheduleManager();
  renderSchedule();
});


// ==============================
// 予定の追加・保存
// ==============================
scheduleForm.addEventListener("submit", event => {
  event.preventDefault();

  const data = {
    id: scheduleId.value || crypto.randomUUID(),
    date: scheduleDate.value,
    time: scheduleTime.value,
    title: scheduleTitle.value.trim(),
    details: scheduleDetails.value.trim(),
    done: false
  };

  if (!data.date || !data.time || !data.title) return;

  if (scheduleId.value) {
    const index = schedules.findIndex(item =>
      item.id === scheduleId.value
    );

    if (index !== -1) {
      data.done = schedules[index].done;
      schedules[index] = data;
    }
  } else {
    schedules.push(data);
  }

  saveSchedules();
  clearScheduleForm();
  renderScheduleManager();
  renderSchedule();
});

function clearScheduleForm() {
  scheduleForm.reset();
  scheduleId.value = "";
  document.getElementById("scheduleFormHeading").textContent =
    "予定を追加";
}

document.getElementById("cancelScheduleEdit")
  .addEventListener("click", clearScheduleForm);


// ==============================
// 今日から明日への切替時刻
// ==============================
document.getElementById("saveSwitchTime")
  .addEventListener("click", () => {
    const value = document.getElementById("switchTime").value;

    if (!value) return;

    localStorage.setItem(SWITCH_KEY, value);

    renderSchedule();
    alert("切替時刻を保存しました。");
  });


// 初期表示
renderSchedule();
