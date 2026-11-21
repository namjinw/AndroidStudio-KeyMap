// ---------- 키보드 레이아웃 (단위: u) ----------
const SUB = { "`": "~", "-": "_", "=": "+", "[": "{", "]": "}", "\\": "|", ";": ":", "'": '"', ",": "<", ".": ">", "/": "?" };
const ICONS = {
  all: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  green: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  red: '<path d="M4 5h16v14H4zM9 5v14"/>',
  blue: '<path d="M7 4l13 8-13 8z"/>',
  brown: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  pink: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
};

function buildLayout() {
  const keys = [];
  const add = (id, label, x, y, w = 1, h = 1, o = {}) => keys.push({ id, label, x, y, w, h, tok: [id], np: false, ...o });
  add("Esc", "Esc", 0, 0);
  for (let i = 0; i < 12; i++) add("F" + (i + 1), "F" + (i + 1), [2, 6.5, 11][Math.floor(i / 4)] + (i % 4), 0);
  ["PrtSc", "ScrLk", "Pause"].forEach((k, i) => add(k, k, 15.25 + i, 0));

  const row1 = "`1234567890-=".split("");
  row1.forEach((k, i) => add(k, k, i, 1.5, 1, 1, k === "=" ? { tok: ["=", "+"] } : k === "-" ? {} : {}));
  add("Backspace", "Backspace", 13, 1.5, 2);
  add("Tab", "Tab", 0, 2.5, 1.5);
  "QWERTYUIOP[]".split("").forEach((k, i) => add(k, k, 1.5 + i, 2.5));
  add("\\", "\\", 13.5, 2.5, 1.5);
  add("Caps", "Caps", 0, 3.5, 1.75);
  "ASDFGHJKL;'".split("").forEach((k, i) => add(k, k, 1.75 + i, 3.5));
  add("Enter", "Enter", 12.75, 3.5, 2.25);
  add("Shift", "Shift", 0, 4.5, 2.25);
  "ZXCVBNM,./".split("").forEach((k, i) => add(k, k, 2.25 + i, 4.5));
  add("Ctrl", "Ctrl", 0, 5.5, 1.25);
  add("Win", "Win", 1.25, 5.5, 1.25, 1, { tok: ["Win"] });
  add("Alt", "Alt", 2.5, 5.5, 1.25);
  add("Space", "", 3.75, 5.5, 7.5);
  add("WinR", "Win", 11.25, 5.5, 1.25, 1, { tok: ["Win"] });
  add("Menu", "Menu", 12.5, 5.5, 1.25);
  // 네비게이션 / 화살표
  ["Ins", "Home", "PgUp"].forEach((k, i) => add(k, k, 15.25 + i, 1.5));
  ["Del", "End", "PgDn"].forEach((k, i) => add(k, k, 15.25 + i, 2.5));
  add("↑", "↑", 16.25, 4.5);
  ["←", "↓", "→"].forEach((k, i) => add(k, k, 15.25 + i, 5.5));
  // 숫자패드
  const np = (id, label, x, y, w = 1, h = 1, tok) => add("Num" + id, label, x, y, w, h, { np: true, tok: tok || ["Num" + id] });
  np("Lk", "Num", 19.5, 1.5); np("/", "/", 20.5, 1.5); np("*", "*", 21.5, 1.5); np("-", "-", 22.5, 1.5, 1, 1, ["-"]);
  np("7", "7", 19.5, 2.5); np("8", "8", 20.5, 2.5); np("9", "9", 21.5, 2.5); np("+", "+", 22.5, 2.5, 1, 2, ["+"]);
  np("4", "4", 19.5, 3.5); np("5", "5", 20.5, 3.5); np("6", "6", 21.5, 3.5);
  np("1", "1", 19.5, 4.5); np("2", "2", 20.5, 4.5); np("3", "3", 21.5, 4.5); np("Enter", "Enter", 22.5, 4.5, 1, 2);
  np("0", "0", 19.5, 5.5, 2); np(".", ".", 21.5, 5.5);
  return keys;
}
const LAYOUT = buildLayout();
const UNIT = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--u"));

// ---------- 상태 ----------
const state = { data: null, layout: "full", category: "all", chip: null, selectedId: null, sidebarOpen: true, keyEls: [] };
const $ = (s) => document.querySelector(s);
const catById = (id) => state.data.categories.find((c) => c.id === id);
const byId = (id) => state.data.shortcuts.find((s) => s.id === id);
const CHIPS = [["Ctrl"], ["Alt"], ["Shift"], ["Ctrl", "Alt"]];

function filtered() {
  return state.data.shortcuts.filter(
    (s) =>
      (state.category === "all" || s.category === state.category) &&
      (!state.chip || state.chip.every((k) => s.keys.includes(k)))
  );
}

// ---------- 렌더: 사이드바 ----------
function renderSidebar() {
  const sb = $("#sidebar");
  sb.classList.toggle("collapsed", !state.sidebarOpen);
  const items = [{ id: "all", label: "전체", count: state.data.shortcuts.length }].concat(
    state.data.categories.map((c) => ({ ...c, count: state.data.shortcuts.filter((s) => s.category === c.id).length }))
  );
  const nav = $("#nav");
  nav.innerHTML = "";
  for (const it of items) {
    const b = document.createElement("button");
    b.className = "nav-item" + (state.category === it.id ? " active" : "");
    b.dataset.cat = it.id;
    b.title = it.label;
    b.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[it.id] || ICONS.pink}</svg><span class="label">${it.label}</span><span class="count">${it.count}</span>`;
    b.onclick = () => {
      state.sidebarOpen = true; // 아이콘 메뉴를 누르면 열림
      state.category = it.id;
      render();
    };
    nav.appendChild(b);
  }
  const list = $("#list");
  list.innerHTML = "";
  const f = filtered();
  if (!f.length) list.innerHTML = '<div class="list-empty">해당하는 단축키가 없습니다.</div>';
  for (const s of f) {
    const b = document.createElement("button");
    b.className = "list-item" + (s.id === state.selectedId ? " active" : "");
    b.dataset.cat = s.category;
    b.innerHTML = `<b></b><small>${s.keys.join(" + ")}</small>`;
    b.firstChild.textContent = s.name;
    b.onclick = () => select(s.id);
    list.appendChild(b);
  }
}

// ---------- 렌더: 칩 / 레이아웃 토글 ----------
function renderChips() {
  const box = $("#chips");
  box.innerHTML = "";
  for (const c of CHIPS) {
    const b = document.createElement("button");
    const on = state.chip && state.chip.join() === c.join();
    b.className = "chip" + (on ? " on" : "");
    b.textContent = c.join(" + ");
    b.onclick = () => { state.chip = on ? null : c; render(); };
    box.appendChild(b);
  }
  document.querySelectorAll("#layoutSeg button").forEach((b) => b.classList.toggle("on", b.dataset.layout === state.layout));
}

// ---------- 렌더: 3D 키보드 ----------
function buildBoard() {
  const u = UNIT();
  const keys = LAYOUT.filter((k) => state.layout === "full" || !k.np);
  const width = state.layout === "full" ? 23.5 : 18.25;
  const board = $("#board");
  board.style.width = width * u + "px";
  board.style.height = 6.5 * u + "px";
  fitBoard();
  board.innerHTML = '<div class="plate"></div>';
  state.keyEls = [];
  for (const k of keys) {
    const el = document.createElement("div");
    el.className = "key";
    el.style.cssText = `left:${k.x * u}px;top:${k.y * u}px;width:${k.w * u - 4}px;height:${k.h * u - 4}px`;
    const sub = SUB[k.label] || (k.id === "=" ? "+" : "");
    el.innerHTML = `<div class="b"></div><div class="l"></div><div class="r"></div><div class="f"></div><div class="top">${sub ? `<i>${sub}</i>` : ""}<span></span></div>`;
    el.querySelector("span").textContent = k.label;
    el.title = k.tok.join(", ");
    el.onclick = () => clickKey(k);
    board.appendChild(el);
    state.keyEls.push({ el, k });
  }
}

// 회전된 보드가 무대 안에 들어오도록 축소
function fitBoard() {
  const stage = $("#stage");
  const u = UNIT();
  const w = (state.layout === "full" ? 23.5 : 18.25) * u;
  const h = 6.5 * u;
  const bboxW = w + 40;
  const bboxH = h * Math.cos((30 * Math.PI) / 180) + 80;
  const s = Math.min(1.25, (stage.clientWidth * 0.94) / bboxW, (stage.clientHeight * 0.94) / bboxH);
  $("#board").style.setProperty("--s", Math.max(0.3, s).toFixed(3));
}
window.addEventListener("resize", () => state.data && fitBoard());

function paintBoard() {
  const sel = byId(state.selectedId);
  const f = filtered();
  const MODS = ["Ctrl", "Shift", "Alt"];
  for (const { el, k } of state.keyEls) {
    el.classList.remove("on", "avail");
    delete el.dataset.cat;
    if (sel && k.tok.some((t) => sel.keys.includes(t))) {
      el.classList.add("on");
      el.dataset.cat = sel.category;
    } else if (!k.tok.every((t) => MODS.includes(t))) {
      const hit = f.find((s) => k.tok.some((t) => s.keys.includes(t)));
      if (hit) { el.classList.add("avail"); el.dataset.cat = hit.category; }
    }
  }
}

// ---------- 렌더: 상세 ----------
function renderDetail(related = []) {
  const s = byId(state.selectedId);
  const box = $("#detail");
  if (!s) { box.innerHTML = '<p class="desc empty">단축키를 선택하세요.</p>'; return; }
  box.dataset.cat = s.category;
  const cat = catById(s.category);
  box.innerHTML = "";
  const combo = document.createElement("div");
  combo.className = "combo";
  s.keys.forEach((k, i) => {
    if (i) combo.insertAdjacentHTML("beforeend", '<span class="plus">+</span>');
    const c = document.createElement("span");
    c.className = "cap";
    c.textContent = k;
    combo.appendChild(c);
  });
  const h = document.createElement("h2");
  h.className = "name";
  h.textContent = s.name;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = cat ? cat.label : "";
  h.appendChild(badge);
  const p = document.createElement("p");
  p.className = "desc" + (s.description ? "" : " empty");
  p.textContent = s.description || "설명이 아직 없습니다.";
  box.append(combo, h, p);
  if (related.length > 1) {
    const r = document.createElement("div");
    r.className = "related";
    r.append("이 키가 쓰이는 단축키:");
    for (const x of related) {
      const b = document.createElement("button");
      b.className = x.id === s.id ? "active" : "";
      b.textContent = x.name;
      b.onclick = () => select(x.id, related);
      r.appendChild(b);
    }
    box.appendChild(r);
  }
}

// ---------- 동작 ----------
let lastRelated = [];
function select(id, related = []) {
  state.selectedId = id;
  lastRelated = related;
  render();
}
function clickKey(k) {
  const matches = state.data.shortcuts.filter((s) => k.tok.some((t) => s.keys.includes(t)));
  if (!matches.length) return;
  const i = matches.findIndex((s) => s.id === state.selectedId);
  select(matches[(i + 1) % matches.length].id, matches); // 같은 키를 다시 누르면 다음 단축키
}
function render() {
  renderSidebar();
  renderChips();
  paintBoard();
  setTimeout(fitBoard, 220); // 사이드바 폭 전환이 끝난 뒤 다시 맞춤
  renderDetail(lastRelated);
}

async function init() {
  state.data = await (await fetch("data/shortcuts.json")).json();
  const def = state.data.shortcuts.find((s) => /hot reload/i.test(s.name)) || state.data.shortcuts[0];
  state.selectedId = def && def.id;
  $("#toggle").onclick = () => { state.sidebarOpen = !state.sidebarOpen; render(); };
  document.querySelectorAll("#layoutSeg button").forEach((b) => (b.onclick = () => {
    state.layout = b.dataset.layout;
    buildBoard();
    render();
  }));
  buildBoard();
  render();
}
init();
