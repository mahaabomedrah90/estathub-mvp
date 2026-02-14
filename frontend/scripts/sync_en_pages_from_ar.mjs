import fs from "fs";
import path from "path";

const enPath = path.resolve("src/i18n/en/pages.json");
const arPath = path.resolve("src/i18n/ar/pages.json");

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));

// هذه الأقسام هي اللي صفحاتك الجديدة تعتمد عليها
const KEYS = ["about", "howItWorks", "faq", "terms", "privacy"];

// دمج: نضيف اللي ناقص في EN من AR بدون ما نحذف الموجود في EN
function deepMergePreferEn(enObj, arObj) {
  if (Array.isArray(enObj)) return enObj;                 // لا نلمس arrays الموجودة بالإنجليزي
  if (Array.isArray(arObj)) return enObj ?? arObj;        // إذا EN مفقود خذ AR
  if (enObj && typeof enObj === "object" && arObj && typeof arObj === "object") {
    const out = { ...arObj, ...enObj };                   // EN يتفوق عند التعارض
    for (const k of Object.keys(arObj)) {
      out[k] = deepMergePreferEn(enObj?.[k], arObj[k]);
    }
    return out;
  }
  return enObj ?? arObj;                                  // لو EN ناقص خذ AR
}

for (const k of KEYS) {
  if (!ar[k]) continue;
  en[k] = deepMergePreferEn(en[k], ar[k]);
}

// ملاحظة: قيم عربية داخل EN ممكن تظهر لو كان EN ناقص.
// هذا مؤقت لكنه يضمن ما تشوفين keys وتختفي أخطاء map.
// بعدين تقدرين تترجمين النصوص الإنجليزية براحتك تدريجيًا.

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
console.log("✅ Synced EN pages.json structure from AR for:", KEYS.join(", "));
