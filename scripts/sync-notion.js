// 노션 단축키 페이지 -> public/data/shortcuts.json
// 사용: npm run sync [노션 URL 또는 페이지 ID]
// 규칙: 이미 description이 있는 단축키는 그대로 두고, 새 단축키만 빈 값으로 추가한다.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/data/shortcuts.json");
const DEFAULT_PAGE = "405e6fa7a8d9806da43bee761c43c038";

const token = process.env.NOTION_KEY;
if (!token) {
  console.error("NOTION_KEY 가 없습니다. .env 를 확인하세요.");
  process.exit(1);
}
const source = process.argv[2] || process.env.NOTION_PAGE_ID || DEFAULT_PAGE;
const pageId = (source.replace(/-/g, "").match(/[0-9a-f]{32}/i) || [])[0];
if (!pageId) {
  console.error("페이지 ID 를 찾지 못했습니다:", source);
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" };

async function children(blockId) {
  const all = [];
  let cursor;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const res = await fetch(url, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${json.message || ""}`);
    all.push(...json.results);
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);
  return all;
}

const text = (rich) => rich.map((r) => r.plain_text).join("");
// 셀 안에서 가장 먼저 나오는 비-default 색상
const colorOf = (rich) =>
  rich.map((r) => r.annotations.color).find((c) => c && c !== "default") || "default";

const MOD_ORDER = ["Ctrl", "Shift", "Alt"];
const ALIAS = { control: "Ctrl", ctrl: "Ctrl", shift: "Shift", alt: "Alt", enter: "Enter", return: "Enter" };

// "Ctrl + '+'" , "Ctrl + ‘" , "Alt+ Enter" 같은 표기를 토큰 배열로 정규화
function parseKeys(raw) {
  const s = raw
    .replace(/[‘’`]/g, "'")
    .replace(/'\+'/g, "\u0000PLUS\u0000");
  const toks = s
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      if (t === "\u0000PLUS\u0000") return "+";
      const a = ALIAS[t.toLowerCase()];
      if (a) return a;
      return t.length === 1 ? t.toUpperCase() : t;
    });
  const uniq = [...new Set(toks)];
  const mods = MOD_ORDER.filter((m) => uniq.includes(m));
  return [...mods, ...uniq.filter((t) => !MOD_ORDER.includes(t))];
}

const blocks = await children(pageId);

// 분류 범례: 색이 있는 불릿 항목
const categories = blocks
  .filter((b) => b.type === "bulleted_list_item")
  .map((b) => {
    const rich = b.bulleted_list_item.rich_text;
    return { id: colorOf(rich), label: text(rich).trim(), color: colorOf(rich) };
  })
  .filter((c) => c.color !== "default");
if (!categories.length) throw new Error("분류 범례를 찾지 못했습니다.");
const fallback = categories.find((c) => c.label === "그 외") || categories[categories.length - 1];

const table = blocks.find((b) => b.type === "table");
if (!table) throw new Error("단축키 표를 찾지 못했습니다.");
const rows = (await children(table.id)).filter(
  (r, i) => !(i === 0 && text(r.table_row.cells[0]).trim() === "키") // 헤더 행 제외
);

let previous = {};
try {
  const old = JSON.parse(await readFile(OUT, "utf8"));
  previous = Object.fromEntries(old.shortcuts.map((s) => [s.id, s]));
} catch {}

const shortcuts = [];
const seen = new Set();
for (const row of rows) {
  const [keyCell, nameCell] = row.table_row.cells;
  const keys = parseKeys(text(keyCell));
  if (!keys.length) continue;
  const id = keys.join("+").toLowerCase();
  if (seen.has(id)) continue;
  seen.add(id);
  const color = colorOf(keyCell);
  const cat = categories.find((c) => c.color === color) || fallback;
  shortcuts.push({
    id,
    name: text(nameCell).trim(),
    description: previous[id]?.description || "",
    keys,
    category: cat.id,
  });
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ categories, shortcuts }, null, 2) + "\n", "utf8");

const fresh = shortcuts.filter((s) => !s.description);
console.log(`저장: ${OUT}`);
console.log(`분류 ${categories.length}개 / 단축키 ${shortcuts.length}개 / 설명 필요 ${fresh.length}개`);
const uncolored = rows.filter((r) => colorOf(r.table_row.cells[0]) === "default").length;
if (uncolored) console.log(`색 없는 행 ${uncolored}개 -> "${fallback.label}"로 분류`);
