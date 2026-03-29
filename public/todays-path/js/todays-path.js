// UI elements
const loader = document.getElementById("loader");
const pageContent = document.getElementById("pageContent");
const messageBoxWrapper = document.getElementById("messageBox");
const messageBox = messageBoxWrapper.querySelector("div");

// UI helpers
function showLoader() {
  loader.classList.remove("hidden");
  pageContent.classList.add("hidden");
  messageBoxWrapper.classList.add("hidden");
}

function showMessage(msg) {
  loader.classList.add("hidden");
  pageContent.classList.add("hidden");
  messageBox.textContent = msg;
  messageBoxWrapper.classList.remove("hidden");
}

function showContent() {
  loader.classList.add("hidden");
  messageBoxWrapper.classList.add("hidden");
  pageContent.classList.remove("hidden");
}

// ---- URL parsing ----
const parts = window.location.pathname.split("/").filter(Boolean);
const token = parts[1];
const day = parts[2] ? parseInt(parts[2], 10) : null;

// ✅ No token/day → show static content immediately
if (!token) {
  showContent();
} else {
  loadTodaysPath();
}

// ---- Main loader ----
function loadTodaysPath() {
  showLoader();

  fetch(`/api/todays-path?token=${token}&day=${day}`)
    .then(res => res.json())
    .then(data => {
      if (!data.ok) {
        showMessage(data.message || "Invalid link");
        return;
      }

      renderContent(data);
      setupNav(day, data.canGoNext);
      showContent();
    })
    .catch(() => {
      showMessage("Something went wrong. Please try again later.");
    });
}

// ---- Render functions ----
function renderContent(data) {
  document.getElementById("gurbani_header").innerHTML = data.gurbani_header;
  document.getElementById("gurbani").innerHTML = data.gurbani;
  document.getElementById("pb").innerHTML = data.meaning_pb;
  document.getElementById("en").innerHTML = data.meaning_en;
}

function setupNav(day, canGoNext) {
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");

  if (prev && day > 1) {
    prev.href = `/todays-path/${token}/${day - 1}`;
  }

  if (next && canGoNext) {
    next.href = `/todays-path/${token}/${day + 1}`;
  }
}
