const dateEl = document.getElementById("todayDate");
const timeEl = document.getElementById("currentTime");

function updateClock() {
  const now = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  dateEl.textContent = `${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}）`;
  timeEl.textContent = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).format(now);
}
updateClock();
setInterval(updateClock, 15000);

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

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
  });
}
