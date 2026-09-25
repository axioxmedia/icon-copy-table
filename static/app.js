const SLUG = "icon-copy-table";
const AXIOXMEDIA_BRAND = "Axiox Media";
const AIO_WATERMARK = "axioxmedia";
const LAST = 1;
const FAMILY_FONT = { solid: "solid", regular: "regular", brands: "brands" };

const I18N = {
  zh: {
    appName: "图标复制表",
    appSub: "专用区字符复制 · 分页加载",
    step0: "选择字体",
    step1: "复制表",
    step1Title: "选择字体",
    step1Lead: "先选定一套字形。按钮只显示家族名，不含发行套件全称。",
    step2Title: "复制表",
    step2Lead: "点击卡片复制专用区字符。粘贴到 Unreal Text 字段，不要输入英文名。",
    nextTable: "打开复制表",
    back: "返回字体",
    remember: "记住本次选择",
    searchPh: "按英文名或码位搜索，例如 skull / biohazard",
    pageSize: "每页",
    copied: "已复制",
    empty: "没有匹配的图标",
    pageOf: "页",
    icons: "个图标",
    shown: "本页",
    solid: "Solid",
    regular: "Regular",
    brands: "Brands Regular",
    themeGold: "黑金",
    themeLight: "浅色",
  },
  en: {
    appName: "Icon Copy Table",
    appSub: "PUA glyph copy · paged load",
    step0: "Choose font",
    step1: "Copy table",
    step1Title: "Choose a font",
    step1Lead: "Pick one family. Buttons show only Solid, Regular, and Brands Regular.",
    step2Title: "Copy table",
    step2Lead: "Click a card to copy the Private Use Area character. Paste it into an Unreal Text field; do not type the English name.",
    nextTable: "Open table",
    back: "Back to fonts",
    remember: "Remember this choice",
    searchPh: "Search an English name or code, for example skull / biohazard",
    pageSize: "Per page",
    copied: "Copied",
    empty: "No matching icons",
    pageOf: "page",
    icons: "icons",
    shown: "this page",
    solid: "Solid",
    regular: "Regular",
    brands: "Brands Regular",
    themeGold: "Gold",
    themeLight: "Light",
  },
};

let uiLang = "zh";
let currentStep = 0;
let families = [];
let selectedFamily = "solid";
let page = 1;
let pageSize = 48;
let pages = 1;
let total = 0;
let query = "";
let remember = true;
let searchTimer = 0;
let theme = "light";

const $ = (id) => document.getElementById(id);

function detectUiLang() {
  const saved = localStorage.getItem("aio.uiLang");
  if (saved === "zh" || saved === "en") return saved;
  return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
}

function t(key) {
  return (I18N[uiLang] && I18N[uiLang][key]) || I18N.en[key] || key;
}

function applyI18n() {
  document.documentElement.lang = uiLang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
  $("langZh").classList.toggle("on", uiLang === "zh");
  $("langEn").classList.toggle("on", uiLang === "en");
  applyTheme();
  renderStepNav();
  renderFamilies();
  if (currentStep === 1) {
    renderCount();
    renderPager();
  }
}

function hideAllStages() {
  for (let i = 0; i <= LAST; i += 1) {
    document.getElementById("stage" + i)?.classList.remove("on");
  }
}

function goStep(n) {
  currentStep = n;
  hideAllStages();
  document.getElementById("stage" + n)?.classList.add("on");
  renderStepNav();
  applyI18n();
}

function renderStepNav() {
  const nav = $("stepNav");
  const labels = [t("step0"), t("step1")];
  nav.innerHTML = labels
    .map((label, idx) => {
      const cls = ["step-pill"];
      if (idx === currentStep) cls.push("on");
      else if (idx < currentStep) cls.push("done");
      return `<button type="button" class="${cls.join(" ")}" data-step="${idx}">${String(idx + 1).padStart(2, "0")} ${label}</button>`;
    })
    .join("");
  nav.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-step"));
      if (idx === 0) goStep(0);
      if (idx === 1 && selectedFamily) {
        goStep(1);
        loadIcons();
      }
    });
  });
}

function loadLocalPrefs() {
  try {
    return JSON.parse(localStorage.getItem(SLUG + ".prefs") || "{}") || {};
  } catch (_err) {
    return {};
  }
}

function saveLocalPrefs(extra) {
  if (!remember && extra && extra.remember !== true) return;
  const cur = loadLocalPrefs();
  const next = {
    ...cur,
    family: selectedFamily,
    page_size: pageSize,
    remember,
    last_query: query,
    theme,
    ...extra,
  };
  localStorage.setItem(SLUG + ".prefs", JSON.stringify(next));
}

async function saveServerPrefs(extra) {
  if (!remember && !(extra && extra.remember === true)) return;
  const body = {
    family: selectedFamily,
    page_size: pageSize,
    remember,
    last_query: query,
    theme,
    ...extra,
  };
  try {
    await fetch("/api/prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (_err) {
    /* helper optional */
  }
}

function persist() {
  saveLocalPrefs({});
  saveServerPrefs({});
}

function applyTheme() {
  theme = theme === "gold" ? "gold" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  const sw = $("themeSwitch");
  if (sw) sw.setAttribute("data-on", theme);
}

function setTheme(next) {
  theme = next === "gold" ? "gold" : "light";
  applyTheme();
  persist();
}

function renderFamilies() {
  const row = $("familyRow");
  if (!row) return;
  row.innerHTML = families
    .map((fam) => {
      const on = fam.id === selectedFamily ? " on" : "";
      const label = t(fam.id);
      const count = fam.count != null ? `${fam.count} ${t("icons")}` : "";
      return `<button type="button" class="family-btn${on}" data-id="${fam.id}">
        <span class="name">${label}</span>
        <span class="meta">${count}</span>
      </button>`;
    })
    .join("");
  row.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedFamily = btn.getAttribute("data-id");
      $("toTable").disabled = !selectedFamily;
      persist();
      renderFamilies();
    });
  });
  $("toTable").disabled = !selectedFamily;
}

function chr(hex) {
  return String.fromCodePoint(parseInt(hex, 16));
}

function flash(msg) {
  const toast = $("toast");
  toast.textContent = msg;
  toast.classList.add("on");
  clearTimeout(flash._t);
  flash._t = setTimeout(() => toast.classList.remove("on"), 1400);
}

async function copyChar(hex, name) {
  const ch = chr(hex);
  try {
    await navigator.clipboard.writeText(ch);
  } catch (_err) {
    const ta = document.createElement("textarea");
    ta.value = ch;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  flash(`${t("copied")} ${name}  →  U+${hex.toUpperCase()}`);
}

function renderGrid(items) {
  const grid = $("grid");
  grid.innerHTML = "";
  if (!items.length) {
    grid.innerHTML = `<p class="lead">${t("empty")}</p>`;
    return;
  }
  const face = FAMILY_FONT[selectedFamily] || "solid";
  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    const glyph = document.createElement("div");
    glyph.className = "glyph " + face;
    glyph.textContent = chr(item.u);
    const body = document.createElement("div");
    body.innerHTML = `<div class="name"></div><div class="meta"></div>`;
    body.querySelector(".name").textContent = item.n;
    body.querySelector(".meta").textContent = "U+" + String(item.u).toUpperCase();
    btn.appendChild(glyph);
    btn.appendChild(body);
    btn.addEventListener("click", () => copyChar(item.u, item.n));
    grid.appendChild(btn);
  });
}

function renderCount() {
  $("count").textContent = `${page} / ${pages} ${t("pageOf")} · ${total} ${t("icons")}`;
}

function pageWindow(cur, max) {
  if (max <= 9) return Array.from({ length: max }, (_, i) => i + 1);
  const set = new Set([1, max, cur, cur - 1, cur + 1, cur - 2, cur + 2]);
  const list = [...set].filter((n) => n >= 1 && n <= max).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function renderPager() {
  const pager = $("pager");
  pager.innerHTML = "";
  if (pages <= 1) return;
  const prev = document.createElement("button");
  prev.textContent = "‹";
  prev.disabled = page <= 1;
  prev.addEventListener("click", () => {
    if (page > 1) {
      page -= 1;
      loadIcons();
    }
  });
  pager.appendChild(prev);
  pageWindow(page, pages).forEach((token) => {
    if (token === "…") {
      const span = document.createElement("span");
      span.className = "ellipsis";
      span.textContent = "…";
      pager.appendChild(span);
      return;
    }
    const btn = document.createElement("button");
    btn.textContent = String(token);
    if (token === page) btn.className = "on";
    btn.addEventListener("click", () => {
      page = token;
      loadIcons();
    });
    pager.appendChild(btn);
  });
  const next = document.createElement("button");
  next.textContent = "›";
  next.disabled = page >= pages;
  next.addEventListener("click", () => {
    if (page < pages) {
      page += 1;
      loadIcons();
    }
  });
  pager.appendChild(next);
}

async function loadIcons() {
  const params = new URLSearchParams({
    family: selectedFamily,
    q: query,
    page: String(page),
    page_size: String(pageSize),
  });
  const res = await fetch("/api/icons?" + params.toString());
  const data = await res.json();
  page = data.page;
  pages = data.pages;
  total = data.total;
  pageSize = data.page_size;
  renderGrid(data.items || []);
  renderCount();
  renderPager();
  persist();
}

async function boot() {
  uiLang = detectUiLang();
  $("langZh").addEventListener("click", () => {
    uiLang = "zh";
    localStorage.setItem("aio.uiLang", "zh");
    applyI18n();
  });
  $("langEn").addEventListener("click", () => {
    uiLang = "en";
    localStorage.setItem("aio.uiLang", "en");
    applyI18n();
  });
  $("themeGold").addEventListener("click", () => setTheme("gold"));
  $("themeLight").addEventListener("click", () => setTheme("light"));

  let defaults = { version: "1.0.0", families: [], page_sizes: [24, 48, 72, 96], prefs: {} };
  try {
    defaults = await (await fetch("/api/defaults")).json();
  } catch (_err) {
    /* offline markup still works after first paint */
  }
  $("appVersion").textContent = "v" + (defaults.version || "1.0.0");
  families = defaults.families || [
    { id: "solid", label: "Solid" },
    { id: "regular", label: "Regular" },
    { id: "brands", label: "Brands Regular" },
  ];

  const local = loadLocalPrefs();
  const prefs = { ...(defaults.prefs || {}), ...local };
  selectedFamily = prefs.family || "solid";
  pageSize = Number(prefs.page_size) || 48;
  remember = prefs.remember !== false;
  query = prefs.last_query || "";
  theme = prefs.theme === "gold" ? "gold" : "light";
  applyTheme();
  $("remember").checked = remember;
  $("q").value = query;

  const sel = $("pageSize");
  (defaults.page_sizes || [24, 48, 72, 96]).forEach((n) => {
    const opt = document.createElement("option");
    opt.value = String(n);
    opt.textContent = String(n);
    if (n === pageSize) opt.selected = true;
    sel.appendChild(opt);
  });

  $("remember").addEventListener("change", () => {
    remember = $("remember").checked;
    if (remember) persist();
  });
  $("toTable").addEventListener("click", () => {
    page = 1;
    goStep(1);
    loadIcons();
  });
  $("backFamily").addEventListener("click", () => goStep(0));
  $("pageSize").addEventListener("change", () => {
    pageSize = Number($("pageSize").value) || 48;
    page = 1;
    loadIcons();
  });
  $("q").addEventListener("input", () => {
    query = $("q").value;
    page = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadIcons, 180);
  });

  applyI18n();
  goStep(0);
}

boot();
