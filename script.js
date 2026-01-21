/**
 * German Learning App - Core Logic
 * Design Philosophy: Robust, Modular, Performance-Oriented
 */

const APP_CONFIG = {
  keys: {
    lang: "deCourseLang",
    progress: "deCourseProgress",
    notesPrefix: "deCourseNotesDay_",
  },
  selectors: {
    body: "body",
    langBtns: ".lang-btn",
    pronounceBtns: "[data-pronounce]",
    progressSegments: ".progress-segment",
    notesToggle: ".notes-toggle",
    notesPanel: ".notes-panel",
    notesText: "[data-notes-text]",
    dayStatusBadge: "[data-day-status]",
  },
  defaults: {
    lang: "en",
    voiceLang: "de-DE",
  }
};

/**
 * Utility: Debounce function to limit execution rate
 * (Used for saving notes efficiently)
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Utility: Safe LocalStorage Wrapper
 */
const storage = {
  get: (key, fallback = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`Error reading ${key}:`, e);
      return fallback;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error saving ${key}:`, e);
    }
  },
  getString: (key) => localStorage.getItem(key),
  setString: (key, val) => localStorage.setItem(key, val),
};

class GermanLearningApp {
  constructor() {
    this.dom = {
      body: document.querySelector(APP_CONFIG.selectors.body),
    };
    this.state = {
      currentLang: APP_CONFIG.defaults.lang,
      voices: [],
    };
    
    // Bind methods to context
    this.init = this.init.bind(this);
  }

  init() {
    // 1. Initialize Language
    this.initLanguage();

    // 2. Determine Page Context
    const pageType = this.dom.body.dataset.page;
    const currentDay = this.dom.body.dataset.day;

    // 3. Initialize Features based on context
    if (pageType === "index") {
      this.initIndexProgress();
    } else if (pageType === "day" && currentDay) {
      this.initDayPage(currentDay);
      this.initNotes(currentDay);
    }

    // 4. Global Features
    this.initTTS();
  }

  /* ===========================
     Language Handling
     =========================== */
  initLanguage() {
    // Load saved preference
    const savedLang = storage.getString(APP_CONFIG.keys.lang);
    this.state.currentLang = (savedLang === "en" || savedLang === "hi") 
      ? savedLang 
      : APP_CONFIG.defaults.lang;
    
    this.applyLanguage(this.state.currentLang);

    // Attach Event Listeners
    const buttons = document.querySelectorAll(APP_CONFIG.selectors.langBtns);
    buttons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const newLang = e.currentTarget.dataset.setLang;
        this.setLanguage(newLang);
      });
    });
  }

  setLanguage(lang) {
    this.state.currentLang = lang;
    storage.setString(APP_CONFIG.keys.lang, lang);
    this.applyLanguage(lang);
    
    // Refresh status labels if on a day page
    if (this.dom.body.dataset.page === "day") {
      this.updateDayStatusLabel(this.dom.body.dataset.day);
    }
  }

  applyLanguage(lang) {
    this.dom.body.setAttribute("data-lang", lang);
    
    // Update button states
    document.querySelectorAll(APP_CONFIG.selectors.langBtns).forEach(btn => {
      const isActive = btn.dataset.setLang === lang;
      btn.classList.toggle("active", isActive);
    });
  }

  /* ===========================
     Progress Logic (Index Page)
     =========================== */
  initIndexProgress() {
    const progressData = storage.get(APP_CONFIG.keys.progress, {});
    const dayCards = document.querySelectorAll(".day-card");

    dayCards.forEach(card => {
      const day = card.dataset.day;
      if (!day) return;

      // Set initial state
      const state = progressData[day] || "incomplete";
      this.updateCardUI(card, state);

      // Add click listeners to segments
      const segments = card.querySelectorAll(APP_CONFIG.selectors.progressSegments);
      segments.forEach(seg => {
        seg.addEventListener("click", (e) => {
          e.preventDefault(); // Prevent link click if nested
          e.stopPropagation();
          
          const newState = seg.dataset.state;
          this.saveProgress(day, newState);
          this.updateCardUI(card, newState);
        });
      });
    });
  }

  updateCardUI(card, state) {
    card.dataset.state = state;
    const segments = card.querySelectorAll(APP_CONFIG.selectors.progressSegments);
    segments.forEach(seg => {
      const isActive = seg.dataset.state === state;
      seg.classList.toggle("active", isActive);
    });
  }

  saveProgress(day, state) {
    const data = storage.get(APP_CONFIG.keys.progress, {});
    data[day] = state;
    storage.set(APP_CONFIG.keys.progress, data);
  }

  /* ===========================
     Day Page Logic
     =========================== */
  initDayPage(day) {
    const progressData = storage.get(APP_CONFIG.keys.progress, {});
    const currentStatus = progressData[day];

    // Auto-mark as "In Progress" if visiting for the first time
    if (!currentStatus || currentStatus === "incomplete") {
      this.saveProgress(day, "in-progress");
    }

    this.updateDayStatusLabel(day);
  }

  updateDayStatusLabel(day) {
    const badgeElements = document.querySelectorAll(APP_CONFIG.selectors.dayStatusBadge);
    if (!badgeElements.length) return;

    const progressData = storage.get(APP_CONFIG.keys.progress, {});
    const state = progressData[day] || "in-progress";

    const labels = {
      en: {
        completed: "Status: Completed",
        "in-progress": "Status: In Progress",
        incomplete: "Status: Incomplete"
      },
      hi: {
        completed: "स्थिति: पूरा",
        "in-progress": "स्थिति: चल रहा है",
        incomplete: "स्थिति: शुरू नहीं"
      }
    };

    const labelText = labels[this.state.currentLang][state] || labels["en"][state];
    
    badgeElements.forEach(el => {
      el.textContent = labelText;
      // Optional: Add visual color coding to text based on state
      if(state === 'completed') el.style.color = 'var(--gold)';
      else if (state === 'in-progress') el.style.color = 'var(--red)';
      else el.style.color = 'var(--muted)';
    });
  }

  /* ===========================
     Audio / TTS Logic
     =========================== */
  initTTS() {
    if (!("speechSynthesis" in window)) {
      console.warn("TTS not supported");
      return;
    }

    // Load voices (Chrome loads them asynchronously)
    window.speechSynthesis.onvoiceschanged = () => {
      this.state.voices = window.speechSynthesis.getVoices();
    };

    const buttons = document.querySelectorAll(APP_CONFIG.selectors.pronounceBtns);
    buttons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        // Animation feedback
        this.playAudio(btn.dataset.pronounce, btn);
      });
    });
  }

  playAudio(text, btnElement) {
    window.speechSynthesis.cancel(); // Stop previous

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9; // Slightly slower for learning
    utter.pitch = 1;
    utter.volume = 1;

    // Attempt to find a high-quality German voice
    const voices = this.state.voices.length ? this.state.voices : window.speechSynthesis.getVoices();
    const deVoice = voices.find(v => v.lang === 'de-DE' && v.name.includes('Google')) 
                 || voices.find(v => v.lang === 'de-DE');
    
    if (deVoice) utter.voice = deVoice;
    else utter.lang = APP_CONFIG.defaults.voiceLang;

    // Visual feedback
    if(btnElement) {
      btnElement.style.color = "var(--gold)";
      btnElement.style.borderColor = "var(--gold)";
    }

    utter.onend = () => {
      if(btnElement) {
        btnElement.style.color = "";
        btnElement.style.borderColor = "";
      }
    };

    window.speechSynthesis.speak(utter);
  }

  /* ===========================
     Notes Logic (Debounced)
     =========================== */
  initNotes(day) {
    const toggleBtn = document.querySelector(APP_CONFIG.selectors.notesToggle);
    const panel = document.querySelector(APP_CONFIG.selectors.notesPanel);
    const textarea = document.querySelector(APP_CONFIG.selectors.notesText);

    if (!toggleBtn || !panel || !textarea) return;

    const storageKey = APP_CONFIG.keys.notesPrefix + day;

    // 1. Load existing notes
    const savedNotes = storage.getString(storageKey);
    if (savedNotes) textarea.value = savedNotes;

    // 2. Debounced Save (waits 500ms after typing stops)
    const saveHandler = debounce((e) => {
      storage.setString(storageKey, e.target.value);
      // Optional: Visual indicator that it saved could go here
    }, 500);

    textarea.addEventListener("input", saveHandler);

    // 3. Toggle Animation
    toggleBtn.addEventListener("click", () => {
      const isHidden = panel.hasAttribute("hidden");
      
      if (isHidden) {
        panel.removeAttribute("hidden");
        // Small timeout to allow browser to register 'display: block' before animating opacity
        requestAnimationFrame(() => {
          panel.style.opacity = "1";
          panel.style.transform = "translateY(0)";
        });
        toggleBtn.classList.add("open");
      } else {
        // Animate out
        panel.style.opacity = "0";
        panel.style.transform = "translateY(-10px)";
        
        setTimeout(() => {
          panel.setAttribute("hidden", "hidden");
        }, 300); // Matches CSS transition time
        toggleBtn.classList.remove("open");
      }
    });

    // Set initial styles for animation
    panel.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    panel.style.opacity = panel.hasAttribute("hidden") ? "0" : "1";
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new GermanLearningApp();
  app.init();
});