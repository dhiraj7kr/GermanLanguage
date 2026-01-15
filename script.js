// Common script for all pages
const LANG_KEY = "deCourseLang";
const PROGRESS_KEY = "deCourseProgress";
const NOTES_KEY_PREFIX = "deCourseNotesDay_"; // 👈 for per-day notes

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
  initLanguageButtons();

  const pageType = document.body.dataset.page;
  if (pageType === "index") {
    initIndexProgress();
  } else if (pageType === "day") {
    initDayPage();
  }

  initPronounceButtons();
  initNotes(); // 👈 init notes on day pages
});

/* ---------- Language Handling ---------- */

function initLanguage() {
  let lang = localStorage.getItem(LANG_KEY);
  if (!lang || (lang !== "en" && lang !== "hi")) {
    lang = "en";
  }
  setLanguage(lang);
}

function initLanguageButtons() {
  const buttons = document.querySelectorAll(".lang-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.setLang;
      setLanguage(lang);
      // Optional: refresh day status label when language changes
      updateDayStatusLabel();
    });
  });
}

function setLanguage(lang) {
  document.body.setAttribute("data-lang", lang);
  localStorage.setItem(LANG_KEY, lang);
  updateLangButtons(lang);
}

function updateLangButtons(lang) {
  const buttons = document.querySelectorAll(".lang-btn");
  buttons.forEach((btn) => {
    const isActive = btn.dataset.setLang === lang;
    btn.classList.toggle("active", isActive);
  });
}

/* ---------- Progress Handling (Index page) ---------- */

function getProgressData() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (e) {
    console.warn("Could not parse progress data:", e);
    return {};
  }
}

function saveProgressData(data) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

function initIndexProgress() {
  const progressData = getProgressData();
  const dayCards = document.querySelectorAll(".day-card");

  dayCards.forEach((card) => {
    const day = card.dataset.day;
    if (!day) return;

    const state = progressData[day] || "incomplete";
    setCardProgressUI(card, state);

    const segments = card.querySelectorAll(".progress-segment");
    segments.forEach((seg) => {
      seg.addEventListener("click", () => {
        const newState = seg.dataset.state;
        if (!newState) return;

        progressData[day] = newState;
        saveProgressData(progressData);
        setCardProgressUI(card, newState);
      });
    });
  });
}

function setCardProgressUI(card, state) {
  const segments = card.querySelectorAll(".progress-segment");
  segments.forEach((seg) => {
    const isActive = seg.dataset.state === state;
    seg.classList.toggle("active", isActive);
  });
  card.dataset.state = state;
}

/* ---------- Day Page Logic ---------- */

function initDayPage() {
  const day = document.body.dataset.day;
  if (!day) return;

  const progressData = getProgressData();
  const current = progressData[day];

  // If the day is not yet completed, mark it as "in-progress" automatically
  if (!current || current === "incomplete") {
    progressData[day] = "in-progress";
    saveProgressData(progressData);
  }

  updateDayStatusLabel();
}

function updateDayStatusLabel() {
  const day = document.body.dataset.day;
  if (!day) return;

  const progressData = getProgressData();
  const badgeElements = document.querySelectorAll("[data-day-status]");
  if (!badgeElements.length) return;

  const state = progressData[day] || "in-progress";
  const label = dayStatusLabel(state);
  badgeElements.forEach((el) => {
    el.textContent = label;
  });
}

function dayStatusLabel(state) {
  const lang = document.body.getAttribute("data-lang") || "en";
  if (lang === "hi") {
    if (state === "completed") return "स्थिति: पूरा";
    if (state === "in-progress") return "स्थिति: चल रहा है";
    return "स्थिति: शुरू नहीं";
  } else {
    if (state === "completed") return "Status: Completed";
    if (state === "in-progress") return "Status: In Progress";
    return "Status: Incomplete";
  }
}

/* ---------- Pronounce Buttons (TTS) ---------- */

function initPronounceButtons() {
  const buttons = document.querySelectorAll("[data-pronounce]");
  if (!buttons.length) return;

  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported in this browser.");
    return;
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.pronounce;
      if (!text) return;

      // Stop any existing speech
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "de-DE";
      utter.rate = 1;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
    });
  });
}

/* ---------- Notes per Day (localStorage) ---------- */

function initNotes() {
  const day = document.body.dataset.day;
  if (!day) return; // only for day pages

  const toggleButton = document.querySelector(".notes-toggle");
  const panel = document.querySelector(".notes-panel");
  const textarea = document.querySelector("[data-notes-text]");

  if (!toggleButton || !panel || !textarea) return;

  const storageKey = NOTES_KEY_PREFIX + day;

  // Load saved notes (if any)
  const saved = localStorage.getItem(storageKey);
  if (saved !== null) {
    textarea.value = saved;
  }

  function saveNotes() {
    localStorage.setItem(storageKey, textarea.value || "");
  }

  // Save automatically while typing
  textarea.addEventListener("input", saveNotes);

  // Toggle open / close
  toggleButton.addEventListener("click", () => {
    const isHidden = panel.hasAttribute("hidden");
    if (isHidden) {
      panel.removeAttribute("hidden");
      toggleButton.classList.add("open");
    } else {
      panel.setAttribute("hidden", "hidden");
      toggleButton.classList.remove("open");
    }
  });
}
