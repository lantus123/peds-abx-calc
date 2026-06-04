import React, { useState, useMemo, useRef, useEffect } from "react";

/* ──────────────────────────────────────────────────────────────
   兒癌病房常用抗感染藥物計算機  (v2 · 多選比較)
   v2 新功能：
   - 最多同時 3 支藥物並列比較
   - 結果固定在上，藥單在下，醫師眼睛不用動
   - 搜尋 + 摺疊分類
   - 每張卡片獨立 regimen 切換 + 複製到剪貼簿
   ────────────────────────────────────────────────────────────── */

const I = {
  shield: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>),
  drop: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z"/></svg>),
  alert: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>),
  dollar: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v18"/><path d="M16 7.5C16 6 14.2 5 12 5S8 6 8 7.8s1.8 2.4 4 2.9 4 1.3 4 3-1.8 2.8-4 2.8-4-1-4-2.3"/></svg>),
  ruler: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3h14v18H5z"/><path d="M5 8h4M5 12h6M5 16h4"/></svg>),
  info: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>),
  star: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...p}><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.6 19.6l1-6L3.3 9.4l6-.9z"/></svg>),
  book: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M19 17H6a2 2 0 0 0-2 2"/></svg>),
  x: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>),
  search: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>),
  copy: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6L9 17l-5-5"/></svg>),
  chev: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6"/></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>),
};

const GROUPS = ["Penicillin / BLI", "Cephalosporin", "Carbapenem", "Glycopeptide", "Aminoglycoside", "Tetracycline / Macrolide / 其他", "Quinolone / Sulfa / Polymyxin", "Antifungal", "Antiviral", "Supportive"];
const PINNED = ["cefuroxime", "piptazo"];
const MAX_COMPARE = 3;

const DRUGS = [
  // ── Penicillin / BLI ──
  { id: "piptazo", name: "Tazocin (Piperacillin/Tazobactam)", short: "Tazocin", group: "Penicillin / BLI", cls: "Piperacillin/Tazobactam", ref: "2", regimens: [
    { intent: "treatment", label: "本科", basis: "weight", mode: "perDay", value: 400, unit: "mg/kg/day", freq: "div Q6H", doses: 4, max: { per: "day", mg: 18000 }, note: "以 Piperacillin 計；Max 18 g 以 Tazocin 總量計" },
    { intent: "treatment", label: "<2 M/O", basis: "weight", mode: "perDose", value: 100, unit: "mg/kg/dose", freq: "Q6H", doses: 4 },
    { intent: "treatment", label: "2–9 M/O", basis: "weight", mode: "perDose", value: 80, unit: "mg/kg/dose", freq: "Q8H", doses: 3 },
    { intent: "treatment", label: ">9 M/O", basis: "weight", mode: "perDose", value: 100, unit: "mg/kg/dose", freq: "Q8H", doses: 3 },
  ]},
  { id: "amoxclav", name: "Amoxicillin/Clavulanate", short: "Augmentin", group: "Penicillin / BLI", cls: "Augmentin", ref: "2,3", regimens: [
    { intent: "treatment", label: "Child", basis: "weight", mode: "perDose", value: 30, unit: "mg/kg/dose", freq: "Q6H", doses: 4, max: { per: "day", mg: 7200 } },
    { intent: "treatment", label: "Adult", basis: "fixed", mode: "perDose", value: 1200, unit: "mg/dose", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 7200 } },
  ]},
  { id: "ticarclav", name: "Ticarcillin/Clavulanate", short: "Ticar/Clav", group: "Penicillin / BLI", cls: "BLI", ref: "2", regimens: [
    { intent: "treatment", label: "General", basis: "weight", mode: "perDay", value: [200, 300], unit: "mg/kg/day", freq: "Q4–6H", doses: [4, 6], max: { per: "day", mg: 18000 }, note: "以 Ticarcillin 計" },
    { intent: "treatment", label: "CF", basis: "weight", mode: "perDay", value: 400, unit: "mg/kg/day", freq: "Q6H", doses: 4, max: { per: "day", mg: 18000 } },
  ]},
  { id: "ampsulbactam", name: "Ampicillin/Sulbactam", short: "Unasyn", group: "Penicillin / BLI", cls: "Unasyn", ref: "2", regimens: [
    { intent: "treatment", label: "<40 kg", basis: "weight", mode: "perDay", value: [100, 200], unit: "mg Amp/kg/day", freq: "Q6H", doses: 4, max: { per: "dose", mg: 2000 }, note: "以 Ampicillin 計" },
    { intent: "treatment", label: ">40 kg", basis: "fixed", mode: "perDose", value: [1500, 3000], unit: "mg/dose", freq: "Q6H", doses: 4, max: { per: "day", mg: 12000 } },
  ]},
  // ── Cephalosporin ──
  { id: "cefazolin", name: "Cefazolin", group: "Cephalosporin", cls: "1st gen", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–mod", basis: "weight", mode: "perDay", value: [25, 50], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "dose", mg: 1000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [100, 150], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "dose", mg: 2000 } },
  ]},
  { id: "cephalexin", name: "Cephalexin", group: "Cephalosporin", cls: "1st gen", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: [25, 50], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 4000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [50, 100], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 4000 } },
  ]},
  { id: "cefuroxime", name: "Cefuroxime", group: "Cephalosporin", cls: "2nd gen", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: 150, unit: "mg/kg/day", freq: "div Q6H", doses: 4, max: { per: "day", mg: 6000 }, note: "slow IV push" },
  ]},
  { id: "cefotaxime", name: "Cefotaxime", group: "Cephalosporin", cls: "3rd gen", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–mod", basis: "weight", mode: "perDay", value: [50, 180], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 6000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [200, 225], unit: "mg/kg/day", freq: "Q4–6H", doses: [4, 6], max: { per: "day", mg: 12000 } },
    { intent: "treatment", label: "Meningitis", basis: "weight", mode: "perDay", value: [225, 300], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 12000 } },
  ]},
  { id: "ceftazidime", name: "Ceftazidime", group: "Cephalosporin", cls: "3rd gen", ref: "2", regimens: [
    { intent: "treatment", label: "本科", basis: "weight", mode: "perDay", value: 150, unit: "mg/kg/day", freq: "div Q8H", doses: 3, max: { per: "day", mg: 6000 } },
    { intent: "treatment", label: "Mild–mod", basis: "weight", mode: "perDay", value: [90, 150], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "day", mg: 3000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [200, 300], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "day", mg: 6000 } },
    { intent: "treatment", label: "FN", basis: "weight", mode: "perDose", value: [50, 100], unit: "mg/kg/dose", freq: "Q8H", doses: 3, max: { per: "day", mg: 6000 } },
  ]},
  { id: "ceftriaxone", name: "Ceftriaxone", group: "Cephalosporin", cls: "3rd gen", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–mod", basis: "weight", mode: "perDose", value: [50, 75], unit: "mg/kg/dose", freq: "QD", doses: 1, max: { per: "day", mg: 4000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: 100, unit: "mg/kg/day", freq: "Q12–24H", doses: [1, 2], max: { per: "day", mg: 4000 }, note: "meningitis / severe immunocompromised" },
  ]},
  { id: "brosym", name: "Brosym (Cefoperazone/Sulbactam)", short: "Brosym", group: "Cephalosporin", cls: "3rd gen", ref: "2", regimens: [
    { intent: "treatment", label: "Child", basis: "weight", mode: "perDay", value: [20, 40], unit: "mg/kg/day", freq: "Q6–12H", doses: [2, 4], note: "以 Cefoperazone 計，1 vial = 1000 mg；每日分 2-4 次" },
    { intent: "treatment", label: "Adult", basis: "fixed", mode: "perDose", value: [500, 1000], unit: "mg/dose", freq: "Q12H", doses: 2, note: "以 Cefoperazone 計" },
  ]},
  { id: "cefepime", name: "Cefepime", group: "Cephalosporin", cls: "4th gen", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–mod", basis: "weight", mode: "perDose", value: 50, unit: "mg/kg/dose", freq: "Q12H", doses: 2, max: { per: "dose", mg: 2000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDose", value: 50, unit: "mg/kg/dose", freq: "Q8–12H", doses: [2, 3], max: { per: "dose", mg: 2000 } },
    { intent: "treatment", label: "FN", basis: "weight", mode: "perDose", value: 50, unit: "mg/kg/dose", freq: "Q8H", doses: 3, max: { per: "dose", mg: 2000 }, note: "預防用改 Q12H" },
  ]},
  { id: "cefpirome", name: "Cefpirome", group: "Cephalosporin", cls: "4th gen", ref: "2", regimens: [
    { intent: "treatment", label: "Child", basis: "weight", mode: "perDay", value: 60, unit: "mg/kg/day", freq: "Q12H", doses: 2, max: { per: "day", mg: 4000 } },
    { intent: "treatment", label: "Adult", basis: "fixed", mode: "perDose", value: [1000, 2000], unit: "mg/dose", freq: "Q12H", doses: 2, max: { per: "day", mg: 4000 } },
  ]},
  // ── Carbapenem ──
  { id: "imipenem", name: "Tienam (Imipenem/Cilastatin)", short: "Tienam", group: "Carbapenem", cls: "Carbapenem", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: [60, 100], unit: "mg/kg/day", freq: "div Q6H", doses: 4, max: { per: "day", mg: 4000 }, note: "以 Imipenem 計；IV drip 30 分" },
  ]},
  { id: "meropenem", name: "Mepem (Meropenem)", short: "Mepem", group: "Carbapenem", cls: "Carbapenem", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDose", value: 40, unit: "mg/kg/dose", freq: "Q8H", doses: 3, max: { per: "dose", mg: 2000 }, note: "IV drip 30 分" },
  ]},
  { id: "ertapenem", name: "Ertapenem", group: "Carbapenem", cls: "Carbapenem", ref: "2", regimens: [
    { intent: "treatment", label: "3 M–12 Y", basis: "weight", mode: "perDose", value: 15, unit: "mg/kg/dose", freq: "Q12H", doses: 2, max: { per: "day", mg: 1000 } },
    { intent: "treatment", label: "≥ Adol", basis: "fixed", mode: "perDose", value: 1000, unit: "mg/dose", freq: "QD", doses: 1, max: { per: "day", mg: 1000 } },
  ]},
  // ── Glycopeptide ──
  { id: "vancomycin", name: "Vancomycin", group: "Glycopeptide", cls: "Glycopeptide", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–mod", basis: "weight", mode: "perDay", value: [40, 45], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 2000 }, note: "IV drip ≥1 hr，conc <5 mg/mL" },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [45, 60], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 4000 }, note: "IV drip ≥1 hr" },
    { intent: "prophylaxis", label: "FN 預防", basis: "bsa", mode: "perDose", value: 400, unit: "mg/m²/dose", freq: "Q12H", doses: 2 },
  ]},
  { id: "teicoplanin", name: "Targocid (Teicoplanin)", short: "Targocid", group: "Glycopeptide", cls: "Glycopeptide", ref: "2,6", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "QD (維持)", doses: 1, loading: { value: 10, unit: "mg/kg/dose Q12H ×3" }, max: { per: "dose", mg: 600 }, note: ">60 kg 用 600 mg" },
  ]},
  // ── Aminoglycoside ──
  { id: "amikacin", name: "Amikacin", group: "Aminoglycoside", cls: "Aminoglycoside", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: 20, unit: "mg/kg/day", freq: "div Q12H", doses: 2, max: { per: "day", mg: 1500 }, warn: true, note: "⚠ 禁忌：腎功能不全 / 近一月內多次使用；建議監測 drug level" },
  ]},
  // ── Tetracycline / Macrolide / 其他 ──
  { id: "tigecycline", name: "Tigecycline", group: "Tetracycline / Macrolide / 其他", cls: "Tetracycline", ref: "2", regimens: [
    { intent: "treatment", label: "8–11 Y/O", basis: "weight", mode: "perDose", value: 1.2, unit: "mg/kg/dose", freq: "Q12H", doses: 2, max: { per: "dose", mg: 50 }, warn: true, note: "⚠ <8 歲不建議使用" },
    { intent: "treatment", label: "12 Y/O", basis: "fixed", mode: "perDose", value: 50, unit: "mg/dose", freq: "Q12H", doses: 2 },
    { intent: "treatment", label: "Adult", basis: "fixed", mode: "perDose", value: 50, unit: "mg/dose", freq: "Q12H", doses: 2, loading: { value: 100, unit: "mg stat ×1" } },
  ]},
  { id: "azithromycin", name: "Azithromycin", group: "Tetracycline / Macrolide / 其他", cls: "Macrolide", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–mod", basis: "weight", mode: "perDose", value: [5, 6], unit: "mg/kg/dose", freq: "QD (維持)", doses: 1, loading: { value: [10, 12], unit: "mg/kg/dose ×1 (Day1)" }, max: { per: "dose", mg: 500 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "QD", doses: 1, max: { per: "dose", mg: 500 } },
    { intent: "treatment", label: "本科", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "QD ×3–5 天", doses: 1, selfPay: true, max: { per: "dose", mg: 500 }, note: "或 BW/3–4 cc；自費" },
  ]},
  { id: "clindamycin", name: "Clindamycin", group: "Tetracycline / Macrolide / 其他", cls: "Lincosamide", ref: "2", regimens: [
    { intent: "treatment", label: "PO", basis: "weight", mode: "perDay", value: [10, 25], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "day", mg: 1800 } },
    { intent: "treatment", label: "IV", basis: "weight", mode: "perDay", value: 20, unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "day", mg: 1800 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [30, 40], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 2700 } },
  ]},
  { id: "linezolid", name: "Linezolid", group: "Tetracycline / Macrolide / 其他", cls: "Oxazolidinone", ref: "2", regimens: [
    { intent: "treatment", label: "<12 Y/O", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "Q8H", doses: 3, max: { per: "dose", mg: 600 } },
    { intent: "treatment", label: ">12 Y/O", basis: "fixed", mode: "perDose", value: 600, unit: "mg/dose", freq: "Q12H", doses: 2 },
  ]},
  { id: "daptomycin", name: "Daptomycin", group: "Tetracycline / Macrolide / 其他", cls: "Lipopeptide", ref: "2", regimens: [
    { intent: "treatment", label: "2–6 Y/O", basis: "weight", mode: "perDose", value: [8, 10], unit: "mg/kg/dose", freq: "QD", doses: 1 },
    { intent: "treatment", label: "6–12 Y", basis: "weight", mode: "perDose", value: 7, unit: "mg/kg/dose", freq: "QD", doses: 1 },
    { intent: "treatment", label: ">12 Y", basis: "weight", mode: "perDose", value: [4, 6], unit: "mg/kg/dose", freq: "QD", doses: 1 },
    { intent: "treatment", label: "MRSA", basis: "weight", mode: "perDose", value: [6, 10], unit: "mg/kg/dose", freq: "QD", doses: 1 },
  ]},
  { id: "metronidazole", name: "Metronidazole", short: "Metro", group: "Tetracycline / Macrolide / 其他", cls: "Misc", ref: "2", regimens: [
    { intent: "treatment", label: "本科", basis: "weight", mode: "perDay", value: 30, unit: "mg/kg/day", freq: "div Q6H", doses: 4, max: { per: "day", mg: 1500 }, loading: { value: 15, unit: "mg/kg/dose ×1" }, note: "IV drip 30 分；CDI 療程 10–14 天" },
    { intent: "treatment", label: "PO", basis: "weight", mode: "perDay", value: [30, 50], unit: "mg/kg/day", freq: "TID", doses: 3, max: { per: "day", mg: 2250 } },
    { intent: "treatment", label: "CDI (PO)", basis: "weight", mode: "perDay", value: 30, unit: "mg/kg/day", freq: "QID", doses: 4, max: { per: "day", mg: 2000 } },
  ]},
  // ── Quinolone / Sulfa / Polymyxin ──
  { id: "ciprofloxacin", name: "Ciprofloxacin", short: "Cipro", group: "Quinolone / Sulfa / Polymyxin", cls: "Quinolone", ref: "2", regimens: [
    { intent: "treatment", label: "PO", basis: "weight", mode: "perDay", value: [20, 30], unit: "mg/kg/day", freq: "BID", doses: 2, max: { per: "day", mg: 1500 } },
    { intent: "treatment", label: "IV", basis: "weight", mode: "perDay", value: [20, 30], unit: "mg/kg/day", freq: "Q12H", doses: 2, max: { per: "day", mg: 800 } },
    { intent: "treatment", label: "CF", basis: "weight", mode: "perDay", value: 30, unit: "mg/kg/day", freq: "Q8–12H", doses: [2, 3], max: { per: "day", mg: 1200 } },
    { intent: "prophylaxis", label: "FN 預防", basis: "bsa", mode: "perDose", value: 300, unit: "mg/m²/dose", freq: "Q12H", doses: 2, selfPay: true },
  ]},
  { id: "levofloxacin", name: "Levofloxacin", short: "Levo", group: "Quinolone / Sulfa / Polymyxin", cls: "Quinolone", ref: "2", regimens: [
    { intent: "treatment", label: "<5 Y", basis: "weight", mode: "perDose", value: [8, 10], unit: "mg/kg/dose", freq: "BID", doses: 2, max: { per: "day", mg: 750 } },
    { intent: "treatment", label: ">5 Y", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "QD", doses: 1, max: { per: "day", mg: 750 } },
  ]},
  { id: "tmpsmx", name: "TMP-SMX", group: "Quinolone / Sulfa / Polymyxin", cls: "Sulfonamide", ref: "2", regimens: [
    { intent: "prophylaxis", label: "PCP (m²)", basis: "bsa", mode: "perDay", value: 150, unit: "mg TMP/m²/day", freq: "QW135 BID", doses: 2, max: { per: "day", mg: 320 }, note: "一三五給藥；速算 16 kg=1#/day(1#=10cc)；白血病 induction course 後開始" },
    { intent: "prophylaxis", label: "PCP (kg)", basis: "weight", mode: "perDay", value: 5, unit: "mg TMP/kg/day", freq: "QW135 BID", doses: 2, max: { per: "day", mg: 320 }, note: "一三五給藥" },
    { intent: "treatment", label: "PCP 治療", basis: "weight", mode: "perDay", value: [15, 20], unit: "mg TMP/kg/day", freq: "Q6–8H", doses: [3, 4], note: "以 TMP 計" },
    { intent: "treatment", label: "MRSA PO", basis: "weight", mode: "perDay", value: [8, 12], unit: "mg TMP/kg/day", freq: "BID", doses: 2, note: "以 TMP 計" },
  ]},
  { id: "colistin", name: "Colistin", group: "Quinolone / Sulfa / Polymyxin", cls: "Polymyxin", ref: "2,3", regimens: [
    { intent: "treatment", label: "General", basis: "weight", mode: "perDay", value: [2.5, 5], unit: "mg/kg/day", freq: "Q6–12H", doses: [2, 4], max: { per: "dose", mg: 100 }, warn: true, note: "⚠ 開 order 單位陷阱：電腦 mg 指 Colimycin，本表以 Colistin Base 計 → 建議用 vial 開立！" },
    { intent: "treatment", label: "Ped alt", basis: "weight", mode: "perDay", value: [4, 6], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "dose", mg: 100 }, warn: true, note: "⚠ 以 Colistin Base 計" },
    { intent: "treatment", label: "Adult alt", basis: "weight", mode: "perDay", value: [2.5, 5], unit: "mg/kg/day", freq: "Q6–12H", doses: [2, 4], max: { per: "dose", mg: 150 }, warn: true, note: "⚠ 以 Colistin Base 計；每日分 2-4 次" },
  ]},
  // ── Antifungal ──
  { id: "caspofungin", name: "Caspofungin", short: "Caspo", group: "Antifungal", cls: "Echinocandin", ref: "2", regimens: [
    { intent: "treatment", label: "本科·大孩", basis: "fixed", mode: "perDay", value: 50, unit: "mg/day", freq: "QD", doses: 1, max: { per: "day", mg: 70 } },
    { intent: "treatment", label: "本科·小孩", basis: "weight", mode: "perDay", value: 2, unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 70 } },
    { intent: "treatment", label: "1–3 M/O", basis: "bsa", mode: "perDose", value: 25, unit: "mg/m²/dose", freq: "QD", doses: 1, max: { per: "day", mg: 70 } },
    { intent: "treatment", label: "3 M–17 Y", basis: "bsa", mode: "perDose", value: [50, 70], unit: "mg/m²/dose", freq: "QD", doses: 1, loading: { value: 70, unit: "mg/m²/dose ×1 (Day1)" }, max: { per: "day", mg: 70 } },
  ]},
  { id: "micafungin", name: "Micafungin", group: "Antifungal", cls: "Echinocandin", ref: "2", regimens: [
    { intent: "treatment", label: ">4 M/O", basis: "weight", mode: "perDay", value: [1.5, 3], unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 150 } },
    { intent: "treatment", label: "<4 M/O", basis: "weight", mode: "perDay", value: 2, unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 150 }, note: "critical ill 可 5–7 mg/kg/day" },
    { intent: "prophylaxis", label: "FN 預防", basis: "weight", mode: "perDay", value: 1, unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 50 }, selfPay: true, note: "含 Vincristine regime；可兩天用一支" },
  ]},
  { id: "amphoconv", name: "Amphotericin B", short: "AmphoB", group: "Antifungal", cls: "Polyene", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: [0.5, 1.5], unit: "mg/kg/day", freq: "QD", doses: 1, note: "dilute D5W 0.1 mg/mL，run 2–6 hr；Ibuprofen 10 mg/kg PO 30 分前防畏寒" },
  ]},
  { id: "ampholipo", name: "Liposomal Amphotericin B", short: "L-AmphoB", group: "Antifungal", cls: "Polyene", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: [3, 5], unit: "mg/kg/day", freq: "QD", doses: 1, note: "infusion >2 hr；Ibuprofen 防畏寒；Max 10 mg/kg/day" },
  ]},
  { id: "fluconazole", name: "Fluconazole", short: "Fluco", group: "Antifungal", cls: "Azole", ref: "1,2,3", regimens: [
    { intent: "treatment", label: "本科 m²", basis: "bsa", mode: "perDay", value: 300, unit: "mg/m²/day", freq: "Q12H", doses: 2, max: { per: "day", mg: 400 }, note: "和 Vincristine 併用須減 VCR 劑量" },
    { intent: "treatment", label: "本科 kg", basis: "weight", mode: "perDay", value: 10, unit: "mg/kg/day", freq: "Q12H", doses: 2, max: { per: "day", mg: 400 } },
    { intent: "treatment", label: "震盪", basis: "bsa", mode: "perDose", value: 450, unit: "mg/m²/dose", freq: "single", doses: 1, note: "單次給藥" },
    { intent: "treatment", label: "Candida", basis: "weight", mode: "perDay", value: [6, 12], unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 400 }, note: "最短療程 28 天" },
    { intent: "treatment", label: "Crypto Men", basis: "weight", mode: "perDay", value: 6, unit: "mg/kg/day", freq: "QD", doses: 1, loading: { value: 12, unit: "mg/kg ×1 (Day1)" }, max: { per: "day", mg: 400 } },
  ]},
  { id: "voriconazole", name: "Voriconazole", short: "Vori", group: "Antifungal", cls: "Azole", ref: "2,4,6", regimens: [
    { intent: "treatment", label: "2–12 Y", basis: "weight", mode: "perDose", value: 9, unit: "mg/kg/dose", freq: "Q12H", doses: 2, loading: { value: 9, unit: "mg/kg/dose Q12H ×2" }, max: { per: "dose", mg: 350 } },
    { intent: "treatment", label: ">12 Y", basis: "weight", mode: "perDose", value: 4, unit: "mg/kg/dose", freq: "Q12H", doses: 2, loading: { value: 6, unit: "mg/kg/dose Q12H ×2" }, max: { per: "dose", mg: 350 } },
    { intent: "prophylaxis", label: "FN 預防", basis: "weight", mode: "perDose", value: [6, 8], unit: "mg/kg/dose", freq: "Q12H", doses: 2, selfPay: true, warn: true, note: "⚠ 不可併用 Vincristine，必要時停 VOR 24–48 hr" },
  ]},
  { id: "posaconazole", name: "Posaconazole", short: "Posa", group: "Antifungal", cls: "Azole", ref: "2", regimens: [
    { intent: "prophylaxis", label: "8 M–12 Y", basis: "weight", mode: "perDose", value: 4, unit: "mg/kg/dose", freq: "TID", doses: 3, note: "搖勻；隨全餐或營養補充品服用" },
    { intent: "prophylaxis", label: ">12 Y", basis: "fixed", mode: "perDose", value: 200, unit: "mg/dose", freq: "TID", doses: 3 },
    { intent: "prophylaxis", label: "緩釋錠", basis: "fixed", mode: "perDose", value: 300, unit: "mg/dose", freq: "QD", doses: 1, loading: { value: 300, unit: "mg BID (Day1)" } },
    { intent: "treatment", label: "Inv <34 kg", basis: "weight", mode: "perDose", value: [4.5, 6], unit: "mg/kg/dose", freq: "Q6H", doses: 4 },
    { intent: "treatment", label: "Inv >8 Y", basis: "fixed", mode: "perDose", value: 200, unit: "mg/dose", freq: "QID", doses: 4 },
  ]},
  // ── Antiviral ──
  { id: "acyclovir", name: "Acyclovir", group: "Antiviral", cls: "Antiviral", ref: "2,3,4", regimens: [
    { intent: "treatment", label: "本科·HSV", basis: "bsa", mode: "perDay", value: 1500, unit: "mg/m²/day", freq: "div Q8H", doses: 3, note: "療程 7–14 天" },
    { intent: "treatment", label: "Mucosal IV", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "Q8H", doses: 3 },
    { intent: "treatment", label: "VZV/Zoster", basis: "bsa", mode: "perDose", value: 500, unit: "mg/m²/dose", freq: "Q8H", doses: 3 },
    { intent: "prophylaxis", label: "HSV 預防", basis: "bsa", mode: "perDose", value: 250, unit: "mg/m²/dose", freq: "Q8H", doses: 3 },
  ]},
  { id: "ganciclovir", name: "Ganciclovir", short: "GCV", group: "Antiviral", cls: "Antiviral", ref: "1,2,4", regimens: [
    { intent: "treatment", label: "Cong CMV", basis: "weight", mode: "perDose", value: 6, unit: "mg/kg/dose", freq: "Q12H", doses: 2, note: "要 IV hydration，不可 on cap；IV drip >1 hr" },
    { intent: "treatment", label: "Induction", basis: "weight", mode: "perDose", value: 5, unit: "mg/kg/dose", freq: "Q12H", doses: 2 },
    { intent: "treatment", label: "Maint", basis: "weight", mode: "perDose", value: 5, unit: "mg/kg/dose", freq: "QD", doses: 1 },
  ]},
  { id: "valganciclovir", name: "Valganciclovir", short: "ValGCV", group: "Antiviral", cls: "Antiviral", ref: "1,2", regimens: [
    { intent: "treatment", label: "本科", basis: "weight", mode: "perDose", value: [15, 18], unit: "mg/kg/dose", freq: "BID", doses: 2, note: "PO with meal" },
    { intent: "treatment", label: "Cong CMV", basis: "weight", mode: "perDose", value: 16, unit: "mg/kg/dose", freq: "Q12H", doses: 2 },
    { intent: "treatment", label: "Retinitis", basis: "fixed", mode: "perDose", value: 900, unit: "mg/dose", freq: "BID", doses: 2, note: "PO" },
  ]},
  { id: "foscarnet", name: "Foscarnet", group: "Antiviral", cls: "Antiviral", ref: "2", regimens: [
    { intent: "treatment", label: "CMV Q8H", basis: "weight", mode: "perDose", value: 60, unit: "mg/kg/dose", freq: "Q8H", doses: 3, note: "Prehydration 10–20 mL/kg；conc <12 mg/mL" },
    { intent: "treatment", label: "CMV Q12H", basis: "weight", mode: "perDose", value: 90, unit: "mg/kg/dose", freq: "Q12H", doses: 2 },
    { intent: "treatment", label: "CMV 維持", basis: "weight", mode: "perDose", value: [90, 120], unit: "mg/kg/dose", freq: "QD", doses: 1 },
    { intent: "treatment", label: "HSV", basis: "weight", mode: "perDose", value: 40, unit: "mg/kg/dose", freq: "Q8H", doses: 3 },
    { intent: "treatment", label: "VZV", basis: "weight", mode: "perDose", value: [40, 60], unit: "mg/kg/dose", freq: "Q8H", doses: 3 },
  ]},
  { id: "famciclovir", name: "Famciclovir", group: "Antiviral", cls: "Antiviral", ref: "2", regimens: [
    { intent: "treatment", label: "Ped (查表)", basis: "wtTable", unit: "依體重查表", freq: "zoster Q8H / recurrent BID", table: [[8, 100], [11, 150], [15, 200], [20, 250], [26, 300], [33, 350], [40, 425], [Infinity, 500]] },
    { intent: "treatment", label: "Zoster adult", basis: "fixed", mode: "perDose", value: 500, unit: "mg/dose", freq: "Q8H", doses: 3 },
    { intent: "treatment", label: "Recurrent", basis: "fixed", mode: "perDose", value: 500, unit: "mg/dose", freq: "BID", doses: 2 },
  ]},
  // ── Supportive ──
  { id: "gcsf", name: "G-CSF (Filgrastim)", short: "G-CSF", group: "Supportive", cls: "Supportive", ref: "—", regimens: [
    { intent: "prophylaxis", label: "Standard SC", basis: "bsa", mode: "perDay", value: 200, unit: "mcg/m²/day", freq: "QD", doses: 1, mcg: true, note: "Infant 5–10 mcg/kg/day；NOON AC 施打" },
  ]},
];

// ── 計算 ──
const asRange = (v) => (Array.isArray(v) ? v : [v, v]);
const r1 = (n) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10);
const fmt = (n, mcg) => {
  if (n == null) return "—";
  const u = mcg ? "mcg" : "mg";
  if (!mcg && n >= 1000) return `${r1(n)} ${u}（${r1(n / 1000)} g）`;
  return `${r1(n)} ${u}`;
};
const fmtShort = (n, mcg) => {
  if (n == null) return "—";
  const u = mcg ? "mcg" : "mg";
  if (!mcg && n >= 1000) return `${r1(n / 1000)} g`;
  return `${r1(n)} ${u}`;
};
const rng = (a, b, mcg) => (a == null ? "—" : Math.abs(a - b) < 0.05 ? fmt(a, mcg) : `${fmt(a, mcg)} – ${fmt(b, mcg)}`);
const rngShort = (a, b, mcg) => (a == null ? "—" : Math.abs(a - b) < 0.05 ? fmtShort(a, mcg) : `${fmtShort(a, mcg)}–${fmtShort(b, mcg)}`);
const pm = (n, mcg) => (n == null ? "—" : `${r1(n)} ${mcg ? "mcg" : "mg"}`);
const prng = (a, b, mcg) => (a == null ? "—" : Math.abs(a - b) < 0.05 ? pm(a, mcg) : `${r1(a)}–${pm(b, mcg)}`);

function compute(reg, wt, bsa) {
  if (reg.basis === "wtTable") {
    const idx = reg.table.findIndex(([maxKg]) => wt <= maxKg);
    const row = idx >= 0 ? reg.table[idx] : reg.table[reg.table.length - 1];
    const lo = idx > 0 ? reg.table[idx - 1][0] + 1 : 0;
    const hi = row[0] === Infinity ? "∞" : row[0];
    return { doseMin: row[1], doseMax: row[1], dayMin: null, dayMax: null, cappedDose: false, cappedDay: false, loading: null,
      work: `${wt} kg → ${lo}–${hi} kg → ${row[1]} mg/劑` };
  }
  const size = reg.basis === "weight" ? wt : reg.basis === "bsa" ? bsa : 1;
  const sizeTxt = reg.basis === "weight" ? `${wt} kg` : reg.basis === "bsa" ? `${bsa.toFixed(2)} m²` : null;
  const [vMin, vMax] = asRange(reg.value);
  const vTxt = vMin === vMax ? `${vMin}` : `${vMin}–${vMax}`;
  const d = reg.doses == null ? null : asRange(reg.doses);
  const dTxt = d ? (d[0] === d[1] ? `${d[0]}` : `${d[0]}–${d[1]}`) : null;
  let doseMin, doseMax, dayMin = null, dayMax = null;
  if (reg.mode === "perDay") {
    dayMin = vMin * size; dayMax = vMax * size;
    doseMin = d ? dayMin / d[1] : null; doseMax = d ? dayMax / d[0] : null;
  } else {
    doseMin = vMin * size; doseMax = vMax * size;
    dayMin = d ? doseMin * d[0] : null; dayMax = d ? doseMax * d[1] : null;
  }
  let work;
  if (reg.mode === "perDay") {
    work = sizeTxt ? `${vTxt} × ${sizeTxt} = ${prng(dayMin, dayMax, reg.mcg)}/day` : `${prng(dayMin, dayMax, reg.mcg)}/day`;
    if (d) work += ` ÷ ${dTxt} = ${prng(doseMin, doseMax, reg.mcg)}/劑`;
  } else {
    work = sizeTxt ? `${vTxt} × ${sizeTxt} = ${prng(doseMin, doseMax, reg.mcg)}/劑` : `固定 ${prng(doseMin, doseMax, reg.mcg)}/劑`;
    if (d && !(d[0] === 1 && d[1] === 1)) work += ` × ${dTxt} = ${prng(dayMin, dayMax, reg.mcg)}/day`;
  }
  let cappedDose = false, cappedDay = false;
  if (reg.max?.per === "dose" && doseMax != null) {
    if (doseMax > reg.max.mg) { cappedDose = true; }
    doseMin = Math.min(doseMin, reg.max.mg); doseMax = Math.min(doseMax, reg.max.mg);
    // 封頂後重算每日總量（dose × 頻次）
    if (cappedDose && d) {
      dayMin = doseMin * d[0]; dayMax = doseMax * d[1];
    }
  }
  if (reg.max?.per === "day" && dayMax != null) {
    if (dayMax > reg.max.mg) { cappedDay = true; }
    dayMin = Math.min(dayMin, reg.max.mg); dayMax = Math.min(dayMax, reg.max.mg);
    // 封頂後重算每劑（day ÷ 頻次）
    if (cappedDay && d) {
      doseMin = dayMin / d[1]; doseMax = dayMax / d[0];
    }
  }
  let loading = null;
  if (reg.loading) {
    const lv = asRange(reg.loading.value);
    loading = reg.basis === "fixed"
      ? `${asRange(reg.loading.value).join("–")} ${reg.loading.unit}`
      : `${fmt(lv[0] * size, reg.mcg)}${lv[1] !== lv[0] ? "–" + fmt(lv[1] * size, reg.mcg) : ""}（${reg.loading.unit}）`;
  }
  return { doseMin, doseMax, dayMin, dayMax, cappedDose, cappedDay, loading, work };
}

// 把 "div Q6H" 改成 "Q6H" — 用於「每劑」context（已經是除過的數字）
const cleanFreq = (f) => f ? f.replace(/^div\s+/i, "") : f;

// 為複製到 HIS 製作純文字摘要
function makeCopyText(drug, reg, res) {
  if (!res) return drug.name;
  const dose = rngShort(res.doseMin, res.doseMax, reg.mcg);
  let s = `${drug.name} ${dose} ${cleanFreq(reg.freq)}`;
  if (res.loading) s += ` (Loading ${res.loading})`;
  if (reg.note) s += ` // ${reg.note.replace(/⚠\s*/g, '')}`;
  return s;
}

// ── 結果卡片 ──
function ResultCard({ drug, regIdx, setRegIdx, regimens, wt, bsa, isProph, onRemove, isSingle }) {
  const reg = regimens[regIdx] || regimens[0];
  const needsHeight = reg?.basis === "bsa" && !bsa;
  const needsWeight = reg?.basis !== "fixed" && !wt;
  const res = reg && !needsWeight && !needsHeight ? compute(reg, wt, bsa) : null;
  const [copied, setCopied] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const copyDose = async () => {
    const txt = makeCopyText(drug, reg, res);
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {}
  };

  const accent = isProph ? "emerald" : "sky";
  const accentBg = isProph ? "bg-emerald-50" : "bg-sky-50";
  const accentBorder = isProph ? "border-emerald-200" : "border-sky-200";
  const accentText = isProph ? "text-emerald-700" : "text-sky-700";

  return (
    <div className={`bg-white rounded-xl border-2 ${accentBorder} overflow-hidden shadow-sm`}>
      {/* Header */}
      <div className={`${accentBg} px-3 py-2 flex items-start justify-between gap-2 border-b ${accentBorder}`}>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-sm ${accentText} truncate`}>{drug.name}</div>
          <div className="text-[10px] text-slate-500 font-mono">{drug.cls} · ref {drug.ref}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {res && (
            <button onClick={copyDose} title="複製到剪貼簿"
              className={`p-1.5 rounded-md transition ${copied ? "bg-green-100 text-green-700" : "hover:bg-white/50 text-slate-500"}`}>
              {copied ? <I.check className="w-3.5 h-3.5" /> : <I.copy className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={onRemove} title="移除" className="p-1.5 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600">
            <I.x className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Regimen tabs */}
      {regimens.length > 1 && (
        <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1">
          {regimens.map((rg, i) => (
            <button key={i} onClick={() => setRegIdx(i)}
              className={`px-2 py-0.5 rounded text-[11px] border flex items-center gap-1 ${
                regIdx === i ? `bg-${accent}-600 text-white border-${accent}-600` : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
              {rg.label}
              {rg.selfPay && <I.dollar className="w-2.5 h-2.5 text-amber-500" />}
              {rg.warn && <I.alert className="w-2.5 h-2.5 text-amber-500" />}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="p-3 space-y-2">
        {needsWeight && <div className="text-xs text-amber-600 flex items-center gap-1"><I.alert className="w-3.5 h-3.5" /> 需輸入體重</div>}
        {needsHeight && <div className="text-xs text-amber-600 flex items-center gap-1"><I.ruler className="w-3.5 h-3.5" /> 此 regimen 需身高（m² 計算）</div>}

        {res && (
          <>
            {/* MAIN DOSE — biggest, eye-catching */}
            <div className="text-center py-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">每劑</div>
              <div className={`text-2xl font-bold font-mono ${res.cappedDose ? "text-amber-700" : "text-slate-900"}`}>
                {rngShort(res.doseMin, res.doseMax, reg.mcg)}
              </div>
              <div className="text-sm font-semibold text-slate-600 mt-0.5">{cleanFreq(reg.freq)}</div>
              {res.cappedDose && <div className="text-[10px] text-amber-600 mt-0.5">⚠ 已封頂</div>}
            </div>

            {/* Loading + per-day in compact row */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {res.loading && (
                <div className="col-span-2 bg-amber-50 rounded px-2 py-1 border border-amber-200">
                  <div className="text-amber-700 font-medium">Loading: {res.loading}</div>
                </div>
              )}
              <div className="bg-slate-50 rounded px-2 py-1">
                <div className="text-slate-400 text-[9px] uppercase tracking-wider">每日總量</div>
                <div className={`font-mono font-semibold ${res.cappedDay ? "text-amber-700" : "text-slate-700"}`}>
                  {res.dayMin == null ? <span className="text-slate-400">依適應症</span> : rngShort(res.dayMin, res.dayMax, reg.mcg)}
                </div>
              </div>
              <div className="bg-slate-50 rounded px-2 py-1">
                <div className="text-slate-400 text-[9px] uppercase tracking-wider">上限</div>
                <div className="font-mono text-slate-700">
                  {reg.max ? `${fmtShort(reg.max.mg, reg.mcg)}/${reg.max.per === "dose" ? "劑" : "日"}` : <span className="text-slate-400">—</span>}
                </div>
              </div>
            </div>

            {/* Note / Warning */}
            {reg.note && (
              <div className={`flex items-start gap-1 text-[11px] rounded px-2 py-1 ${reg.warn ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-50 text-slate-600"}`}>
                {reg.warn ? <I.alert className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" /> : <I.info className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />}
                <span className="leading-tight">{reg.note}</span>
              </div>
            )}
            {reg.selfPay && (
              <div className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                <I.dollar className="w-3 h-3" /> 自費 — 開立請選「自備」
              </div>
            )}

            {/* Detail toggle */}
            <button onClick={() => setShowDetail((v) => !v)} className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 py-1">
              <I.book className="w-3 h-3" />
              {showDetail ? "收起手冊原文" : "看手冊原文 / 算式"}
              <I.chev className={`w-3 h-3 transition ${showDetail ? "rotate-180" : ""}`} />
            </button>
            {showDetail && (
              <div className="bg-slate-50 rounded px-2 py-1.5 space-y-1 text-[10px]">
                <div className="font-mono text-slate-600">{reg.value != null ? asRange(reg.value).join("–") + " " : ""}{reg.unit} · {reg.freq}</div>
                <div className="font-mono text-slate-500 border-t border-dashed border-slate-300 pt-1">{res.work}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── 主元件 ──
export default function App() {
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [ageUnit, setAgeUnit] = useState("yr");
  const [height, setHeight] = useState("");
  const [intent, setIntent] = useState("treatment");
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [selected, setSelected] = useState([]); // [{id, regIdx}]
  const [resultMinimized, setResultMinimized] = useState(false);

  const wt = parseFloat(weight) || 0;
  const ht = parseFloat(height) || 0;
  const bsa = wt && ht ? Math.sqrt((ht * wt) / 3600) : 0;

  const drugs = useMemo(() => DRUGS.filter((d) => d.regimens.some((r) => r.intent === intent)), [intent]);

  // 切換 intent 時清空已選（regimen 不通用）
  const pickIntent = (v) => {
    if (v === intent) return;
    setIntent(v); setSelected([]);
  };

  const toggleDrug = (id) => {
    setSelected((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      if (prev.length >= MAX_COMPARE) return prev; // 限制 3 支
      return [...prev, { id, regIdx: 0 }];
    });
  };

  const setRegIdxFor = (id, regIdx) => {
    setSelected((prev) => prev.map((s) => (s.id === id ? { ...s, regIdx } : s)));
  };

  const removeDrug = (id) => setSelected((prev) => prev.filter((s) => s.id !== id));
  const clearAll = () => setSelected([]);
  const isSelected = (id) => selected.some((s) => s.id === id);
  const toggleGroup = (g) => setCollapsedGroups((c) => ({ ...c, [g]: !c[g] }));

  // 搜尋過濾
  const searchedDrugs = useMemo(() => {
    if (!search.trim()) return drugs;
    const q = search.toLowerCase();
    return drugs.filter((d) => d.name.toLowerCase().includes(q) || (d.short || "").toLowerCase().includes(q) || d.cls.toLowerCase().includes(q));
  }, [drugs, search]);

  const isProph = intent === "prophylaxis";
  const cnt = selected.length;

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-800 font-sans overflow-hidden">
      {/* ───── 上段 1：病人資料（固定） ───── */}
      <div className="shrink-0 bg-slate-100 border-b border-slate-200 px-3 py-2">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h1 className="text-base font-bold tracking-tight text-slate-900">兒癌病房 抗感染計算機</h1>
            <span className="text-[10px] text-slate-400 font-mono">{DRUGS.length} 支</span>
          </div>
          {/* Compact patient inputs in one row */}
          <div className="flex items-center gap-1.5">
            <label className="flex items-center bg-white rounded-lg border border-slate-200 px-2 py-1 flex-1">
              <span className="text-[10px] text-slate-500 mr-1.5">體重</span>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—"
                className="w-full text-sm font-mono text-slate-900 outline-none bg-transparent min-w-0" />
              <span className="text-[10px] text-slate-400 ml-0.5">kg</span>
            </label>
            <label className="flex items-center bg-white rounded-lg border border-slate-200 px-2 py-1 flex-1">
              <span className="text-[10px] text-slate-500 mr-1.5">身高</span>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="—"
                className="w-full text-sm font-mono text-slate-900 outline-none bg-transparent min-w-0" />
              <span className="text-[10px] text-slate-400 ml-0.5">cm</span>
            </label>
            <label className="flex items-center bg-white rounded-lg border border-slate-200 px-2 py-1 w-20">
              <span className="text-[10px] text-slate-500 mr-1">齡</span>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="—"
                className="w-full text-sm font-mono text-slate-900 outline-none bg-transparent min-w-0" />
              <button onClick={() => setAgeUnit(ageUnit === "yr" ? "mo" : "yr")}
                className="text-[10px] text-sky-600 ml-0.5 shrink-0">{ageUnit === "yr" ? "歲" : "月"}</button>
            </label>
          </div>
          {bsa > 0 && <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 font-mono">
            <I.ruler className="w-3 h-3" /> BSA ≈ {bsa.toFixed(2)} m²
          </div>}

          {/* Intent toggle */}
          <div className="grid grid-cols-2 gap-1 mt-1.5 p-0.5 bg-slate-200/60 rounded-lg">
            {[["treatment", "治療", I.drop], ["prophylaxis", "預防", I.shield]].map(([v, lab, Ic]) => (
              <button key={v} onClick={() => pickIntent(v)}
                className={`flex items-center justify-center gap-1 py-1 rounded text-xs font-medium transition ${
                  intent === v ? (v === "prophylaxis" ? "bg-emerald-600 text-white shadow-sm" : "bg-sky-600 text-white shadow-sm") : "text-slate-600"}`}>
                <Ic className="w-3.5 h-3.5" /> {lab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ───── 上段 2：結果區（固定，內部可滾動） ───── */}
      {(cnt > 0 || true) && (
        <div className={`shrink-0 bg-slate-100 border-b border-slate-200 px-3 ${cnt === 0 ? "py-2" : "pt-2 pb-3"}`}>
          <div className="max-w-4xl mx-auto">
            {cnt === 0 ? (
              <div className="bg-white/70 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-center">
                <span className="text-slate-400 text-xs">↓ 點下方藥物開始計算（最多 {MAX_COMPARE} 支同時比較）</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <button onClick={() => setResultMinimized((v) => !v)} className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold hover:text-slate-700">
                    <I.chev className={`w-3 h-3 transition ${resultMinimized ? "-rotate-90" : ""}`} />
                    劑量結果 {cnt}/{MAX_COMPARE}
                  </button>
                  <button onClick={clearAll} className="text-[10px] text-slate-500 hover:text-rose-600 underline-offset-2 hover:underline">清空</button>
                </div>
                {!resultMinimized && (
                  <div className={`grid gap-2 max-h-[50vh] overflow-y-auto ${cnt === 1 ? "grid-cols-1" : cnt === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                    {selected.map((s) => {
                      const drug = DRUGS.find((d) => d.id === s.id);
                      if (!drug) return null;
                      const regs = drug.regimens.filter((r) => r.intent === intent);
                      return (
                        <ResultCard key={s.id} drug={drug} regIdx={s.regIdx} setRegIdx={(i) => setRegIdxFor(s.id, i)}
                          regimens={regs} wt={wt} bsa={bsa} isProph={isProph} onRemove={() => removeDrug(s.id)} isSingle={cnt === 1} />
                      );
                    })}
                  </div>
                )}
                {resultMinimized && (
                  <div className="flex flex-wrap gap-1">
                    {selected.map((s) => {
                      const drug = DRUGS.find((d) => d.id === s.id);
                      if (!drug) return null;
                      const regs = drug.regimens.filter((r) => r.intent === intent);
                      const reg = regs[s.regIdx] || regs[0];
                      const res = reg && wt && (reg.basis !== "bsa" || bsa) ? compute(reg, wt, bsa) : null;
                      return (
                        <span key={s.id} className={`text-[11px] px-2 py-1 rounded ${isProph ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>
                          {drug.short || drug.name}: <b>{res ? `${rngShort(res.doseMin, res.doseMax, reg.mcg)} ${cleanFreq(reg.freq)}` : "—"}</b>
                          <button onClick={() => removeDrug(s.id)} className="ml-1 hover:opacity-70"><I.x className="w-2.5 h-2.5 inline" /></button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ───── 下段：藥物選擇區（獨立滾動） ───── */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6">
        <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          {/* Search */}
          <div className="relative mb-3">
            <I.search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋藥物（中英文 / 商品名）"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600">
                <I.x className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pinned 常用 (always visible) */}
          {!search && (() => {
            const pin = PINNED.map((id) => searchedDrugs.find((d) => d.id === id)).filter(Boolean);
            if (!pin.length) return null;
            return (
              <div className="mb-3 pb-3 border-b border-slate-200">
                <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-1.5 flex items-center gap-1">
                  <I.star className="w-3 h-3" /> 常用
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pin.map((d) => <DrugChip key={d.id} drug={d} big selected={isSelected(d.id)} disabled={!isSelected(d.id) && cnt >= MAX_COMPARE} onClick={() => toggleDrug(d.id)} />)}
                </div>
              </div>
            );
          })()}

          {/* Groups */}
          {GROUPS.map((g) => {
            const list = searchedDrugs.filter((d) => d.group === g);
            if (!list.length) return null;
            const collapsed = collapsedGroups[g] && !search;
            return (
              <div key={g} className="mb-2">
                <button onClick={() => toggleGroup(g)} className="w-full flex items-center justify-between text-left mb-1 group">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 group-hover:text-slate-600">{g} <span className="text-slate-300">({list.length})</span></span>
                  {!search && <I.chev className={`w-3 h-3 text-slate-400 transition ${collapsed ? "" : "rotate-180"}`} />}
                </button>
                {!collapsed && (
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((d) => <DrugChip key={d.id} drug={d} selected={isSelected(d.id)} disabled={!isSelected(d.id) && cnt >= MAX_COMPARE} onClick={() => toggleDrug(d.id)} />)}
                  </div>
                )}
              </div>
            );
          })}

          {searchedDrugs.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-6">找不到「{search}」</div>
          )}
        </div>

        <p className="text-[10px] text-slate-400 mt-4 leading-relaxed text-center">
          決策輔助工具，不取代臨床判斷與處方查證；所有劑量請與主治確認後開立。腎/肝功能調整尚未納入。
        </p>
        </div>
      </div>
    </div>
  );
}

// 藥物 chip 元件
function DrugChip({ drug, big, selected, disabled, onClick }) {
  let className = "rounded-full border transition flex items-center gap-1 ";
  className += big ? "px-3 py-1.5 text-sm font-semibold " : "px-2.5 py-1 text-xs ";
  if (selected) {
    className += "bg-sky-600 border-sky-600 text-white shadow-sm";
  } else if (disabled) {
    className += "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed";
  } else if (big) {
    className += "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100";
  } else {
    className += "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50";
  }
  return (
    <button onClick={onClick} disabled={disabled} className={className} title={disabled ? `最多比較 ${MAX_COMPARE} 支` : drug.name}>
      {selected && <I.check className="w-3 h-3" />}
      {big && !selected && <I.star className="w-3 h-3 text-amber-500" />}
      {drug.short || drug.name}
    </button>
  );
}
