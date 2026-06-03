import React, { useState, useMemo } from "react";

/* ──────────────────────────────────────────────────────────────
   兒癌病房常用抗感染藥物計算機  (v1 · 全表)
   來源：兒血/兒癌科抗感染藥物手冊 p.27–35 + FN 預防表
   未收：p.26 Penicillins(PCN G/V, Amox, Ampi, Oxa, Diclox) ·
         p.36 Palivizumab / CMV-IVIG / Ribavirin / Oseltamivir（照片未提供）
   renal/hepatic adjust → 下一階段
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
};

const GROUPS = ["Penicillin / BLI", "Cephalosporin", "Carbapenem", "Glycopeptide", "Aminoglycoside", "Tetracycline / Macrolide / 其他", "Quinolone / Sulfa / Polymyxin", "Antifungal", "Antiviral", "Supportive"];
const PINNED = ["cefuroxime", "piptazo"]; // 病房最常用，釘在最上方

// basis: weight | bsa | fixed | wtTable    mode: perDose | perDay
// value/doses 可為 number 或 [min,max]   max:{per:'dose'|'day', mg}
const DRUGS = [
  // ── Penicillin / BLI ──
  { id: "piptazo", name: "Piperacillin/Tazobactam", group: "Penicillin / BLI", cls: "Tazocin", ref: "2", regimens: [
    { intent: "treatment", label: "本科用法", basis: "weight", mode: "perDay", value: 400, unit: "mg/kg/day", freq: "div Q6H", doses: 4, max: { per: "day", mg: 18000 }, note: "以 Piperacillin 計；Max 18 g 以 Tazocin 總量計" },
    { intent: "treatment", label: "<2 M/O", basis: "weight", mode: "perDose", value: 100, unit: "mg/kg/dose", freq: "Q6H", doses: 4, note: "Piperacillin 計" },
    { intent: "treatment", label: "2–9 M/O", basis: "weight", mode: "perDose", value: 80, unit: "mg/kg/dose", freq: "Q8H", doses: 3, note: "Piperacillin 計" },
    { intent: "treatment", label: ">9 M/O", basis: "weight", mode: "perDose", value: 100, unit: "mg/kg/dose", freq: "Q8H", doses: 3, note: "Piperacillin 計" },
  ]},
  { id: "amoxclav", name: "Amoxicillin/Clavulanate", group: "Penicillin / BLI", cls: "Augmentin", ref: "2,3", regimens: [
    { intent: "treatment", label: "Child", basis: "weight", mode: "perDose", value: 30, unit: "mg/kg/dose", freq: "Q6H", doses: 4, max: { per: "day", mg: 7200 }, note: "IV drip" },
    { intent: "treatment", label: "Adult", basis: "fixed", mode: "perDose", value: 1200, unit: "mg/dose", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 7200 } },
  ]},
  { id: "ticarclav", name: "Ticarcillin/Clavulanate", group: "Penicillin / BLI", cls: "BLI", ref: "2", regimens: [
    { intent: "treatment", label: "General", basis: "weight", mode: "perDay", value: [200, 300], unit: "mg/kg/day", freq: "Q4–6H", doses: [4, 6], max: { per: "day", mg: 18000 }, note: "以 Ticarcillin 計；成人 Max 24 g/day" },
    { intent: "treatment", label: "Cystic fibrosis", basis: "weight", mode: "perDay", value: 400, unit: "mg/kg/day", freq: "Q6H", doses: 4, max: { per: "day", mg: 18000 } },
  ]},
  { id: "ampsulbactam", name: "Ampicillin/Sulbactam", group: "Penicillin / BLI", cls: "Unasyn", ref: "2", regimens: [
    { intent: "treatment", label: "<40 kg", basis: "weight", mode: "perDay", value: [100, 200], unit: "mg Amp/kg/day", freq: "Q6H", doses: 4, max: { per: "dose", mg: 2000 }, note: "以 Ampicillin 計；或 Max 400 mg/kg/day。Meningitis/severe 需更高劑量" },
    { intent: "treatment", label: ">40 kg", basis: "fixed", mode: "perDose", value: [1500, 3000], unit: "mg Unasyn/dose", freq: "Q6H", doses: 4, max: { per: "day", mg: 12000 } },
  ]},

  // ── Cephalosporin ──
  { id: "cefazolin", name: "Cefazolin", group: "Cephalosporin", cls: "1st gen", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–moderate", basis: "weight", mode: "perDay", value: [25, 50], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "dose", mg: 1000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [100, 150], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "dose", mg: 2000 } },
  ]},
  { id: "cephalexin", name: "Cephalexin", group: "Cephalosporin", cls: "1st gen", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: [25, 50], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 4000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [50, 100], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 4000 } },
  ]},
  { id: "cefuroxime", name: "Cefuroxime", group: "Cephalosporin", cls: "2nd gen", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: 150, unit: "mg/kg/day", freq: "div Q6H", doses: 4, max: { per: "day", mg: 6000 }, note: "slow IV push；Max child 6 g、adult 9 g/day" },
  ]},
  { id: "cefotaxime", name: "Cefotaxime", group: "Cephalosporin", cls: "3rd gen", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–moderate", basis: "weight", mode: "perDay", value: [50, 180], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 6000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [200, 225], unit: "mg/kg/day", freq: "Q4–6H", doses: [4, 6], max: { per: "day", mg: 12000 } },
    { intent: "treatment", label: "Meningitis", basis: "weight", mode: "perDay", value: [225, 300], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 12000 } },
  ]},
  { id: "ceftazidime", name: "Ceftazidime", group: "Cephalosporin", cls: "3rd gen", ref: "2", regimens: [
    { intent: "treatment", label: "本科用法", basis: "weight", mode: "perDay", value: 150, unit: "mg/kg/day", freq: "div Q8H", doses: 3, max: { per: "day", mg: 6000 }, note: "本科：150 mg/kg/day div q8h" },
    { intent: "treatment", label: "Mild–moderate", basis: "weight", mode: "perDay", value: [90, 150], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "day", mg: 3000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [200, 300], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "day", mg: 6000 } },
    { intent: "treatment", label: "Febrile neutropenia", basis: "weight", mode: "perDose", value: [50, 100], unit: "mg/kg/dose", freq: "Q8H", doses: 3, max: { per: "day", mg: 6000 } },
  ]},
  { id: "ceftriaxone", name: "Ceftriaxone", group: "Cephalosporin", cls: "3rd gen", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–moderate", basis: "weight", mode: "perDose", value: [50, 75], unit: "mg/kg/dose", freq: "QD", doses: 1, max: { per: "day", mg: 4000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: 100, unit: "mg/kg/day", freq: "Q12–24H", doses: [1, 2], max: { per: "day", mg: 4000 }, note: "Max 4000 mg/day：meningitis / severe immunocompromised" },
  ]},
  { id: "brosym", name: "Brosym (Cefoperazone/Sulbactam)", group: "Cephalosporin", cls: "3rd gen", ref: "2", regimens: [
    { intent: "treatment", label: "Child", basis: "weight", mode: "perDay", value: [20, 40], unit: "mg/kg/day", freq: "2–4 dose", doses: [2, 4], note: "以 Cefoperazone 計，1 vial = 1000 mg；Max 80/80 mg/kg/day" },
    { intent: "treatment", label: "Adult", basis: "fixed", mode: "perDose", value: [500, 1000], unit: "mg/dose", freq: "Q12H", doses: 2, note: "以 Cefoperazone 計；Max 2 g q12h (2 vial)" },
  ]},
  { id: "cefepime", name: "Cefepime", group: "Cephalosporin", cls: "4th gen", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–moderate", basis: "weight", mode: "perDose", value: 50, unit: "mg/kg/dose", freq: "Q12H", doses: 2, max: { per: "dose", mg: 2000 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDose", value: 50, unit: "mg/kg/dose", freq: "Q8–12H", doses: [2, 3], max: { per: "dose", mg: 2000 } },
    { intent: "treatment", label: "Febrile neutropenia", basis: "weight", mode: "perDose", value: 50, unit: "mg/kg/dose", freq: "Q8H", doses: 3, max: { per: "dose", mg: 2000 }, note: "預防性使用則改 Q12H" },
  ]},
  { id: "cefpirome", name: "Cefpirome", group: "Cephalosporin", cls: "4th gen", ref: "2", regimens: [
    { intent: "treatment", label: "Child", basis: "weight", mode: "perDay", value: 60, unit: "mg/kg/day", freq: "Q12H", doses: 2, max: { per: "day", mg: 4000 } },
    { intent: "treatment", label: "Adult", basis: "fixed", mode: "perDose", value: [1000, 2000], unit: "mg/dose", freq: "Q12H", doses: 2, max: { per: "day", mg: 4000 } },
  ]},

  // ── Carbapenem ──
  { id: "imipenem", name: "Imipenem/Cilastatin", group: "Carbapenem", cls: "Carbapenem", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: [60, 100], unit: "mg/kg/day", freq: "div Q6H", doses: 4, max: { per: "day", mg: 4000 }, note: "以 Imipenem 計；IV drip 30 分" },
  ]},
  { id: "meropenem", name: "Meropenem", group: "Carbapenem", cls: "Carbapenem", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDose", value: 40, unit: "mg/kg/dose", freq: "Q8H", doses: 3, max: { per: "dose", mg: 2000 }, note: "IV drip 30 分" },
  ]},
  { id: "ertapenem", name: "Ertapenem", group: "Carbapenem", cls: "Carbapenem", ref: "2", regimens: [
    { intent: "treatment", label: "3 M–12 Y", basis: "weight", mode: "perDose", value: 15, unit: "mg/kg/dose", freq: "Q12H", doses: 2, max: { per: "day", mg: 1000 } },
    { intent: "treatment", label: "Adolescent / Adult", basis: "fixed", mode: "perDose", value: 1000, unit: "mg/dose", freq: "QD", doses: 1, max: { per: "day", mg: 1000 } },
  ]},

  // ── Glycopeptide ──
  { id: "vancomycin", name: "Vancomycin", group: "Glycopeptide", cls: "Glycopeptide", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–moderate", basis: "weight", mode: "perDay", value: [40, 45], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 2000 }, note: "IV drip ≥1 hr，conc <5 mg/mL" },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [45, 60], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 4000 }, note: "IV drip ≥1 hr，conc <5 mg/mL" },
    { intent: "prophylaxis", label: "FN 預防", basis: "bsa", mode: "perDose", value: 400, unit: "mg/m²/dose", freq: "Q12H", doses: 2 },
  ]},
  { id: "teicoplanin", name: "Teicoplanin", group: "Glycopeptide", cls: "Glycopeptide", ref: "2,6", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "QD (維持)", doses: 1, loading: { value: 10, unit: "mg/kg/dose Q12H ×3" }, max: { per: "dose", mg: 600 }, note: ">60 kg 用 600 mg" },
  ]},

  // ── Aminoglycoside ──
  { id: "amikacin", name: "Amikacin", group: "Aminoglycoside", cls: "Aminoglycoside", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: 20, unit: "mg/kg/day", freq: "div Q12H", doses: 2, max: { per: "day", mg: 1500 }, warn: true, note: "⚠ 禁忌：腎功能不全 / 近一月內多次使用；建議監測 drug level" },
  ]},

  // ── Tetracycline / Macrolide / 其他 ──
  { id: "tigecycline", name: "Tigecycline", group: "Tetracycline / Macrolide / 其他", cls: "Tetracycline", ref: "2", regimens: [
    { intent: "treatment", label: "8–11 Y/O", basis: "weight", mode: "perDose", value: 1.2, unit: "mg/kg/dose", freq: "Q12H", doses: 2, max: { per: "dose", mg: 50 }, warn: true, note: "⚠ <8 歲不建議使用" },
    { intent: "treatment", label: "12 Y/O", basis: "fixed", mode: "perDose", value: 50, unit: "mg/dose", freq: "Q12H", doses: 2, max: { per: "dose", mg: 50 } },
    { intent: "treatment", label: "Adult", basis: "fixed", mode: "perDose", value: 50, unit: "mg/dose", freq: "Q12H", doses: 2, loading: { value: 100, unit: "mg stat ×1" }, max: { per: "dose", mg: 50 } },
  ]},
  { id: "azithromycin", name: "Azithromycin", group: "Tetracycline / Macrolide / 其他", cls: "Macrolide", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–moderate", basis: "weight", mode: "perDose", value: [5, 6], unit: "mg/kg/dose", freq: "QD (維持)", doses: 1, loading: { value: [10, 12], unit: "mg/kg/dose ×1 (Day1)" }, max: { per: "dose", mg: 500 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "QD", doses: 1, max: { per: "dose", mg: 500 } },
    { intent: "treatment", label: "本科用法", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "QD ×3–5 天", doses: 1, selfPay: true, max: { per: "dose", mg: 500 }, note: "或 BW/3–4 cc；自費" },
  ]},
  { id: "clindamycin", name: "Clindamycin", group: "Tetracycline / Macrolide / 其他", cls: "Lincosamide", ref: "2", regimens: [
    { intent: "treatment", label: "Mild–mod (PO)", basis: "weight", mode: "perDay", value: [10, 25], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "day", mg: 1800 } },
    { intent: "treatment", label: "Mild–mod (IV)", basis: "weight", mode: "perDay", value: 20, unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "day", mg: 1800 } },
    { intent: "treatment", label: "Severe", basis: "weight", mode: "perDay", value: [30, 40], unit: "mg/kg/day", freq: "Q6–8H", doses: [3, 4], max: { per: "day", mg: 2700 }, note: "PO Max 1800、IV Max 2700 mg/day" },
  ]},
  { id: "linezolid", name: "Linezolid", group: "Tetracycline / Macrolide / 其他", cls: "Oxazolidinone", ref: "2", regimens: [
    { intent: "treatment", label: "<12 Y/O", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "Q8H", doses: 3, max: { per: "dose", mg: 600 } },
    { intent: "treatment", label: ">12 Y/O", basis: "fixed", mode: "perDose", value: 600, unit: "mg/dose", freq: "Q12H", doses: 2, max: { per: "dose", mg: 600 } },
  ]},
  { id: "daptomycin", name: "Daptomycin", group: "Tetracycline / Macrolide / 其他", cls: "Lipopeptide", ref: "2", regimens: [
    { intent: "treatment", label: "2–6 Y/O", basis: "weight", mode: "perDose", value: [8, 10], unit: "mg/kg/dose", freq: "QD", doses: 1, note: "dilute NS 25–50 mL，IV drip 30–60 分" },
    { intent: "treatment", label: "6–12 Y/O", basis: "weight", mode: "perDose", value: 7, unit: "mg/kg/dose", freq: "QD", doses: 1 },
    { intent: "treatment", label: ">12 Y/O", basis: "weight", mode: "perDose", value: [4, 6], unit: "mg/kg/dose", freq: "QD", doses: 1 },
    { intent: "treatment", label: "MRSA", basis: "weight", mode: "perDose", value: [6, 10], unit: "mg/kg/dose", freq: "QD", doses: 1 },
  ]},
  { id: "metronidazole", name: "Metronidazole", group: "Tetracycline / Macrolide / 其他", cls: "Misc", ref: "2", regimens: [
    { intent: "treatment", label: "本科用法", basis: "weight", mode: "perDay", value: 30, unit: "mg/kg/day", freq: "div Q6H", doses: 4, max: { per: "day", mg: 1500 }, loading: { value: 15, unit: "mg/kg/dose ×1" }, note: "IV drip 30 分；CDI 療程 10–14 天" },
    { intent: "treatment", label: "General (PO)", basis: "weight", mode: "perDay", value: [30, 50], unit: "mg/kg/day", freq: "TID", doses: 3, max: { per: "day", mg: 2250 } },
    { intent: "treatment", label: "C. difficile (PO)", basis: "weight", mode: "perDay", value: 30, unit: "mg/kg/day", freq: "QID", doses: 4, max: { per: "day", mg: 2000 } },
  ]},

  // ── Quinolone / Sulfa / Polymyxin ──
  { id: "ciprofloxacin", name: "Ciprofloxacin", group: "Quinolone / Sulfa / Polymyxin", cls: "Quinolone", ref: "2", regimens: [
    { intent: "treatment", label: "General (PO)", basis: "weight", mode: "perDay", value: [20, 30], unit: "mg/kg/day", freq: "BID", doses: 2, max: { per: "day", mg: 1500 } },
    { intent: "treatment", label: "General (IV)", basis: "weight", mode: "perDay", value: [20, 30], unit: "mg/kg/day", freq: "Q12H", doses: 2, max: { per: "day", mg: 800 } },
    { intent: "treatment", label: "Cystic fibrosis", basis: "weight", mode: "perDay", value: 30, unit: "mg/kg/day", freq: "Q8–12H", doses: [2, 3], max: { per: "day", mg: 1200 }, note: "slow IV drip 60 分；PO Max 2000、IV Max 1200 mg/day" },
    { intent: "prophylaxis", label: "FN 預防", basis: "bsa", mode: "perDose", value: 300, unit: "mg/m²/dose", freq: "Q12H", doses: 2, selfPay: true },
  ]},
  { id: "levofloxacin", name: "Levofloxacin", group: "Quinolone / Sulfa / Polymyxin", cls: "Quinolone", ref: "2", regimens: [
    { intent: "treatment", label: "<5 Y/O", basis: "weight", mode: "perDose", value: [8, 10], unit: "mg/kg/dose", freq: "BID", doses: 2, max: { per: "day", mg: 750 } },
    { intent: "treatment", label: ">5 Y/O", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "QD", doses: 1, max: { per: "day", mg: 750 } },
  ]},
  { id: "tmpsmx", name: "TMP-SMX", group: "Quinolone / Sulfa / Polymyxin", cls: "Sulfonamide（以 TMP 計）", ref: "2", regimens: [
    { intent: "prophylaxis", label: "PCP 預防 (m²)", basis: "bsa", mode: "perDay", value: 150, unit: "mg TMP/m²/day", freq: "QW135 BID", doses: 2, max: { per: "day", mg: 320 }, note: "一三五給藥；速算 16 kg=1#/day(1#=10cc)；白血病 induction course 後開始；1 vial(5cc)→D5W 75–125cc，run 1.5 hr" },
    { intent: "prophylaxis", label: "PCP 預防 (kg)", basis: "weight", mode: "perDay", value: 5, unit: "mg TMP/kg/day", freq: "QW135 BID", doses: 2, max: { per: "day", mg: 320 }, note: "一三五給藥；白血病 induction course 後開始" },
    { intent: "treatment", label: "PCP 治療", basis: "weight", mode: "perDay", value: [15, 20], unit: "mg TMP/kg/day", freq: "Q6–8H", doses: [3, 4], note: "以 TMP 計" },
    { intent: "treatment", label: "MRSA (PO)", basis: "weight", mode: "perDay", value: [8, 12], unit: "mg TMP/kg/day", freq: "BID", doses: 2, note: "以 TMP 計" },
  ]},
  { id: "colistin", name: "Colistin", group: "Quinolone / Sulfa / Polymyxin", cls: "Polymyxin（以 Colistin Base 計）", ref: "2,3", regimens: [
    { intent: "treatment", label: "General", basis: "weight", mode: "perDay", value: [2.5, 5], unit: "mg/kg/day", freq: "Q6–12H", doses: [2, 4], max: { per: "dose", mg: 100 }, warn: true, note: "⚠ 開 order 單位陷阱：電腦 mg 指 Colimycin，本表以 Colistin Base 計 → 建議用 vial 開立！Max 100(小兒)/150(成人) mg/dose" },
    { intent: "treatment", label: "Pediatric (alt)", basis: "weight", mode: "perDay", value: [4, 6], unit: "mg/kg/day", freq: "Q8H", doses: 3, max: { per: "dose", mg: 100 }, warn: true, note: "⚠ 以 Colistin Base 計，建議用 vial 開立" },
    { intent: "treatment", label: "Adult (alt)", basis: "weight", mode: "perDay", value: [2.5, 5], unit: "mg/kg/day", freq: "2–4 dose", doses: [2, 4], max: { per: "dose", mg: 150 }, warn: true, note: "⚠ 以 Colistin Base 計，建議用 vial 開立" },
  ]},

  // ── Antifungal ──
  { id: "caspofungin", name: "Caspofungin", group: "Antifungal", cls: "Echinocandin", ref: "2", regimens: [
    { intent: "treatment", label: "本科 · 大小孩", basis: "fixed", mode: "perDay", value: 50, unit: "mg/day", freq: "QD", doses: 1, max: { per: "day", mg: 70 } },
    { intent: "treatment", label: "本科 · 小小孩", basis: "weight", mode: "perDay", value: 2, unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 70 } },
    { intent: "treatment", label: "1–3 M/O", basis: "bsa", mode: "perDose", value: 25, unit: "mg/m²/dose", freq: "QD", doses: 1, max: { per: "day", mg: 70 } },
    { intent: "treatment", label: "3 M–17 Y", basis: "bsa", mode: "perDose", value: [50, 70], unit: "mg/m²/dose", freq: "QD", doses: 1, loading: { value: 70, unit: "mg/m²/dose ×1 (Day1)" }, max: { per: "day", mg: 70 } },
  ]},
  { id: "micafungin", name: "Micafungin", group: "Antifungal", cls: "Echinocandin", ref: "2", regimens: [
    { intent: "treatment", label: ">4 M/O", basis: "weight", mode: "perDay", value: [1.5, 3], unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 150 } },
    { intent: "treatment", label: "<4 M/O", basis: "weight", mode: "perDay", value: 2, unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 150 }, note: "critical ill 可 5–7 mg/kg/day" },
    { intent: "prophylaxis", label: "FN 預防", basis: "weight", mode: "perDay", value: 1, unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 50 }, selfPay: true, note: "含 Vincristine regime；可兩天用一支" },
  ]},
  { id: "amphoconv", name: "Amphotericin B (conventional)", group: "Antifungal", cls: "Polyene", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: [0.5, 1.5], unit: "mg/kg/day", freq: "QD", doses: 1, note: "dilute D5W 0.1 mg/mL，run 2–6 hr；Ibuprofen 10 mg/kg PO 30 分前防畏寒；W1,4 monitor GOT/GPT/BUN/Cr/Na/K/Ca" },
  ]},
  { id: "ampholipo", name: "Liposomal Amphotericin B", group: "Antifungal", cls: "Polyene", ref: "2", regimens: [
    { intent: "treatment", label: "Standard", basis: "weight", mode: "perDay", value: [3, 5], unit: "mg/kg/day", freq: "QD", doses: 1, note: "dilute D5W/D10W（大小孩 2 mg/mL、小小孩 0.5 mg/mL），infusion >2 hr；Ibuprofen 防畏寒；Max 10 mg/kg/day" },
  ]},
  { id: "fluconazole", name: "Fluconazole", group: "Antifungal", cls: "Azole", ref: "1,2,3", regimens: [
    { intent: "treatment", label: "本科 (m²)", basis: "bsa", mode: "perDay", value: 300, unit: "mg/m²/day", freq: "Q12H / BID", doses: 2, max: { per: "day", mg: 400 }, note: "和 Vincristine 併用須減 VCR 劑量；Max 12 mg/kg/day ≈ adult 400 mg/day" },
    { intent: "treatment", label: "本科 (kg)", basis: "weight", mode: "perDay", value: 10, unit: "mg/kg/day", freq: "Q12H / BID", doses: 2, max: { per: "day", mg: 400 } },
    { intent: "treatment", label: "震盪療法", basis: "bsa", mode: "perDose", value: 450, unit: "mg/m²/dose", freq: "single", doses: 1, note: "單次給藥" },
    { intent: "treatment", label: "Systemic candidiasis", basis: "weight", mode: "perDay", value: [6, 12], unit: "mg/kg/day", freq: "QD", doses: 1, max: { per: "day", mg: 400 }, note: "最短療程 28 天" },
    { intent: "treatment", label: "Cryptococcal meningitis", basis: "weight", mode: "perDay", value: 6, unit: "mg/kg/day", freq: "QD", doses: 1, loading: { value: 12, unit: "mg/kg ×1 (Day1)" }, max: { per: "day", mg: 400 }, note: "可達 12 mg/kg/day；CSF 轉陰後續 10–12 週" },
  ]},
  { id: "voriconazole", name: "Voriconazole", group: "Antifungal", cls: "Azole", ref: "2,4,6", regimens: [
    { intent: "treatment", label: "2–12 Y", basis: "weight", mode: "perDose", value: 9, unit: "mg/kg/dose", freq: "Q12H", doses: 2, loading: { value: 9, unit: "mg/kg/dose Q12H ×2" }, max: { per: "dose", mg: 350 }, note: "Max IV 350 mg/dose" },
    { intent: "treatment", label: ">12 Y", basis: "weight", mode: "perDose", value: 4, unit: "mg/kg/dose", freq: "Q12H", doses: 2, loading: { value: 6, unit: "mg/kg/dose Q12H ×2" }, max: { per: "dose", mg: 350 }, note: "Max IV 350 mg/dose" },
    { intent: "prophylaxis", label: "FN 預防", basis: "weight", mode: "perDose", value: [6, 8], unit: "mg/kg/dose", freq: "Q12H", doses: 2, selfPay: true, warn: true, note: "⚠ 不可併用 Vincristine，必要時停 VOR 24–48 hr；>40 kg Max 200 mg/dose(1#)；用後 1 週驗 drug level（給藥前 30 min）" },
  ]},
  { id: "posaconazole", name: "Posaconazole", group: "Antifungal", cls: "Azole", ref: "2", regimens: [
    { intent: "prophylaxis", label: "預防 8 M–12 Y", basis: "weight", mode: "perDose", value: 4, unit: "mg/kg/dose", freq: "TID", doses: 3, note: "搖勻；隨全餐或營養補充品服用" },
    { intent: "prophylaxis", label: "預防 >12 Y", basis: "fixed", mode: "perDose", value: 200, unit: "mg/dose", freq: "TID", doses: 3 },
    { intent: "prophylaxis", label: "預防 · 緩釋錠", basis: "fixed", mode: "perDose", value: 300, unit: "mg/dose", freq: "QD (維持)", doses: 1, loading: { value: 300, unit: "mg BID (Day1)" } },
    { intent: "treatment", label: "Invasive <34 kg", basis: "weight", mode: "perDose", value: [4.5, 6], unit: "mg/kg/dose", freq: "Q6H", doses: 4, note: "有反應後改 9–12 mg/kg/dose Q12H" },
    { intent: "treatment", label: "Invasive >8 Y", basis: "fixed", mode: "perDose", value: 200, unit: "mg/dose", freq: "QID", doses: 4, note: "或 400 mg BID" },
  ]},

  // ── Antiviral ──
  { id: "acyclovir", name: "Acyclovir", group: "Antiviral", cls: "Antiviral", ref: "2,3,4", regimens: [
    { intent: "treatment", label: "本科 · HSV", basis: "bsa", mode: "perDay", value: 1500, unit: "mg/m²/day", freq: "div Q8H", doses: 3, note: "療程 7–14 天；PO Max 80 mg/kg/day" },
    { intent: "treatment", label: "Mucosal / cutaneous (IV)", basis: "weight", mode: "perDose", value: 10, unit: "mg/kg/dose", freq: "Q8H", doses: 3 },
    { intent: "treatment", label: "VZV / Zoster (免疫低下)", basis: "bsa", mode: "perDose", value: 500, unit: "mg/m²/dose", freq: "Q8H", doses: 3, note: "或 10–15 mg/kg/dose Q8H" },
    { intent: "prophylaxis", label: "HSV 預防 (<40 kg)", basis: "bsa", mode: "perDose", value: 250, unit: "mg/m²/dose", freq: "Q8H", doses: 3, note: "或 PO 60–90 mg/kg/day；Prophylaxis IV Max 80 mg/kg/day" },
  ]},
  { id: "ganciclovir", name: "Ganciclovir", group: "Antiviral", cls: "Antiviral", ref: "1,2,4", regimens: [
    { intent: "treatment", label: "Congenital CMV", basis: "weight", mode: "perDose", value: 6, unit: "mg/kg/dose", freq: "Q12H", doses: 2, note: "要 IV hydration，不可 on cap；先 D/W10mL→50 mg/mL，再 NS/LR/D5W→10 mg/mL，IV drip >1 hr" },
    { intent: "treatment", label: "Induction (IV)", basis: "weight", mode: "perDose", value: 5, unit: "mg/kg/dose", freq: "Q12H", doses: 2 },
    { intent: "treatment", label: "Maintenance (IV)", basis: "weight", mode: "perDose", value: 5, unit: "mg/kg/dose", freq: "QD", doses: 1 },
  ]},
  { id: "valganciclovir", name: "Valganciclovir", group: "Antiviral", cls: "Antiviral", ref: "1,2", regimens: [
    { intent: "treatment", label: "本科用法", basis: "weight", mode: "perDose", value: [15, 18], unit: "mg/kg/dose", freq: "BID", doses: 2, note: "PO with meal" },
    { intent: "treatment", label: "Congenital CMV", basis: "weight", mode: "perDose", value: 16, unit: "mg/kg/dose", freq: "Q12H", doses: 2 },
    { intent: "treatment", label: "CMV retinitis 誘導", basis: "fixed", mode: "perDose", value: 900, unit: "mg/dose", freq: "BID", doses: 2, note: "PO" },
  ]},
  { id: "foscarnet", name: "Foscarnet", group: "Antiviral", cls: "Antiviral", ref: "2", regimens: [
    { intent: "treatment", label: "CMV 誘導 (Q8H)", basis: "weight", mode: "perDose", value: 60, unit: "mg/kg/dose", freq: "Q8H", doses: 3, note: "Prehydration 10–20 mL/kg(Max 1000)；dilute conc <12 mg/mL，IV drip 1–2 hr" },
    { intent: "treatment", label: "CMV 誘導 (Q12H)", basis: "weight", mode: "perDose", value: 90, unit: "mg/kg/dose", freq: "Q12H", doses: 2 },
    { intent: "treatment", label: "CMV 維持", basis: "weight", mode: "perDose", value: [90, 120], unit: "mg/kg/dose", freq: "QD", doses: 1 },
    { intent: "treatment", label: "HSV", basis: "weight", mode: "perDose", value: 40, unit: "mg/kg/dose", freq: "Q8H", doses: 3 },
    { intent: "treatment", label: "VZV (chickenpox)", basis: "weight", mode: "perDose", value: [40, 60], unit: "mg/kg/dose", freq: "Q8H", doses: 3 },
  ]},
  { id: "famciclovir", name: "Famciclovir", group: "Antiviral", cls: "Antiviral", ref: "2", regimens: [
    { intent: "treatment", label: "Pediatric (體重查表)", basis: "wtTable", unit: "依體重查表", freq: "依適應症 (zoster Q8H / recurrent BID)", table: [[8, 100], [11, 150], [15, 200], [20, 250], [26, 300], [33, 350], [40, 425], [Infinity, 500]] },
    { intent: "treatment", label: "Herpes zoster (成人)", basis: "fixed", mode: "perDose", value: 500, unit: "mg/dose", freq: "Q8H", doses: 3 },
    { intent: "treatment", label: "Recurrent (免疫低下)", basis: "fixed", mode: "perDose", value: 500, unit: "mg/dose", freq: "BID", doses: 2 },
  ]},

  // ── Supportive ──
  { id: "gcsf", name: "G-CSF (Filgrastim)", group: "Supportive", cls: "Supportive", ref: "—", regimens: [
    { intent: "prophylaxis", label: "Standard (SC)", basis: "bsa", mode: "perDay", value: 200, unit: "mcg/m²/day", freq: "QD", doses: 1, mcg: true, note: "Infant 5–10 mcg/kg/day；NOON AC 施打" },
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
const rng = (a, b, mcg) => (a == null ? "—" : Math.abs(a - b) < 0.05 ? fmt(a, mcg) : `${fmt(a, mcg)} – ${fmt(b, mcg)}`);
const pm = (n, mcg) => (n == null ? "—" : `${r1(n)} ${mcg ? "mcg" : "mg"}`);
const prng = (a, b, mcg) => (a == null ? "—" : Math.abs(a - b) < 0.05 ? pm(a, mcg) : `${r1(a)}–${pm(b, mcg)}`);

function compute(reg, wt, bsa) {
  if (reg.basis === "wtTable") {
    const idx = reg.table.findIndex(([maxKg]) => wt <= maxKg);
    const row = idx >= 0 ? reg.table[idx] : reg.table[reg.table.length - 1];
    const lo = idx > 0 ? reg.table[idx - 1][0] + 1 : 0;
    const hi = row[0] === Infinity ? "∞" : row[0];
    return { doseMin: row[1], doseMax: row[1], dayMin: null, dayMax: null, cappedDose: false, cappedDay: false, loading: null,
      work: `體重 ${wt} kg → ${lo}–${hi} kg 區間 → ${row[1]} mg/劑` };
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
  // working line built from RAW (pre-cap) values so it can be hand-verified
  let work;
  if (reg.mode === "perDay") {
    work = sizeTxt ? `${vTxt} × ${sizeTxt} = ${prng(dayMin, dayMax, reg.mcg)}/day` : `${prng(dayMin, dayMax, reg.mcg)}/day`;
    if (d) work += ` ÷ ${dTxt} = ${prng(doseMin, doseMax, reg.mcg)}/劑`;
  } else {
    work = sizeTxt ? `${vTxt} × ${sizeTxt} = ${prng(doseMin, doseMax, reg.mcg)}/劑` : `固定 ${prng(doseMin, doseMax, reg.mcg)}/劑`;
    if (d && !(d[0] === 1 && d[1] === 1)) work += ` × ${dTxt} = ${prng(dayMin, dayMax, reg.mcg)}/day`;
  }
  // caps
  let cappedDose = false, cappedDay = false;
  if (reg.max?.per === "dose" && doseMax != null) {
    if (doseMax > reg.max.mg) { cappedDose = true; work += ` → 封頂 ${fmt(reg.max.mg, reg.mcg)}/劑`; }
    doseMin = Math.min(doseMin, reg.max.mg); doseMax = Math.min(doseMax, reg.max.mg);
  }
  if (reg.max?.per === "day" && dayMax != null) {
    if (dayMax > reg.max.mg) { cappedDay = true; work += ` → 封頂 ${fmt(reg.max.mg, reg.mcg)}/日`; }
    dayMin = Math.min(dayMin, reg.max.mg); dayMax = Math.min(dayMax, reg.max.mg);
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

export default function App() {
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [ageUnit, setAgeUnit] = useState("yr");
  const [height, setHeight] = useState("");
  const [intent, setIntent] = useState("treatment");
  const [drugId, setDrugId] = useState(null);
  const [regIdx, setRegIdx] = useState(0);

  const wt = parseFloat(weight) || 0;
  const ht = parseFloat(height) || 0;
  const bsa = wt && ht ? Math.sqrt((ht * wt) / 3600) : 0;

  const drugs = useMemo(() => DRUGS.filter((d) => d.regimens.some((r) => r.intent === intent)), [intent]);
  const drug = DRUGS.find((d) => d.id === drugId) || null;
  const regimens = drug ? drug.regimens.filter((r) => r.intent === intent) : [];
  const reg = regimens[regIdx] || null;
  const needsHeight = reg?.basis === "bsa" && !bsa;
  const res = reg && wt && (reg.basis !== "bsa" || bsa) ? compute(reg, wt, bsa) : null;

  const pickIntent = (v) => { setIntent(v); setDrugId(null); setRegIdx(0); };
  const pickDrug = (id) => { setDrugId(id); setRegIdx(0); };

  const isProph = intent === "prophylaxis";
  const C = isProph
    ? { chip: "bg-emerald-50 border-emerald-400 text-emerald-800", regSel: "bg-emerald-600 text-white border-emerald-600", card: "bg-emerald-50" }
    : { chip: "bg-sky-50 border-sky-400 text-sky-800", regSel: "bg-sky-600 text-white border-sky-600", card: "bg-sky-50" };

  const chip = (d, big) => (
    <button key={(big ? "p-" : "") + d.id} onClick={() => pickDrug(d.id)}
      className={`rounded-full border transition flex items-center gap-1 ${big ? "px-4 py-2 text-sm font-semibold" : "px-3 py-1.5 text-sm"} ${
        drugId === d.id ? C.chip : big ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}>
      {big ? <I.star className="w-3.5 h-3.5 text-amber-500" /> : null}{d.name}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">兒癌病房 抗感染藥物計算機</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">{DRUGS.length} 支 · 來源 p.27–35 + FN 表 · renal adjust 下一階段</p>
        </header>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[["體重", weight, setWeight, "kg"], ["年齡", age, setAge, ""], ["身高", height, setHeight, "cm"]].map(([lab, val, set, u]) => (
            <label key={lab} className="bg-white rounded-lg border border-slate-200 px-3 py-2">
              <span className="block text-[11px] text-slate-500">{lab}</span>
              <span className="flex items-baseline gap-1">
                <input type="number" value={val} onChange={(e) => set(e.target.value)} placeholder="—"
                  className="w-full text-lg font-mono text-slate-900 outline-none bg-transparent" />
                {lab === "年齡"
                  ? <button onClick={(e) => { e.preventDefault(); setAgeUnit(ageUnit === "yr" ? "mo" : "yr"); }}
                      className="text-xs text-sky-600 shrink-0 hover:underline underline-offset-2">{ageUnit === "yr" ? "歲" : "月"}</button>
                  : <span className="text-xs text-slate-400">{u}</span>}
              </span>
            </label>
          ))}
        </div>
        {bsa > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 font-mono">
            <I.ruler className="w-3.5 h-3.5" /> BSA (Mosteller) ≈ {bsa.toFixed(2)} m²
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-200/60 rounded-xl">
          {[["treatment", "治療", I.drop], ["prophylaxis", "預防", I.shield]].map(([v, lab, Ic]) => (
            <button key={v} onClick={() => pickIntent(v)}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                intent === v ? (v === "prophylaxis" ? "bg-emerald-600 text-white" : "bg-sky-600 text-white") : "text-slate-600"}`}>
              <Ic className="w-4 h-4" /> {lab}
            </button>
          ))}
        </div>

        <div className="mb-3">
          {(() => {
            const pin = PINNED.map((id) => drugs.find((d) => d.id === id)).filter(Boolean);
            if (!pin.length) return null;
            return (
              <div className="mb-3 pb-3 border-b border-slate-200">
                <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-1.5 flex items-center gap-1"><I.star className="w-3 h-3" />常用</div>
                <div className="flex flex-wrap gap-2">{pin.map((d) => chip(d, true))}</div>
              </div>
            );
          })()}
          {GROUPS.map((g) => {
            const list = drugs.filter((d) => d.group === g);
            if (!list.length) return null;
            return (
              <div key={g} className="mb-2.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">{g}</div>
                <div className="flex flex-wrap gap-1.5">{list.map((d) => chip(d))}</div>
              </div>
            );
          })}
        </div>

        {drug && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-slate-100">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-900">{drug.name}</span>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">{drug.cls} · ref {drug.ref}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {regimens.map((rg, i) => (
                  <button key={i} onClick={() => setRegIdx(i)}
                    className={`px-2.5 py-1 rounded-md text-xs border flex items-center gap-1 ${
                      regIdx === i ? C.regSel : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                    {rg.label}{rg.selfPay && <I.dollar className="w-3 h-3 text-amber-500" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {!wt && <p className="text-sm text-slate-400">請輸入體重</p>}
              {wt > 0 && needsHeight && (
                <p className="text-sm text-amber-600 flex items-center gap-1.5"><I.ruler className="w-4 h-4" /> 此劑量以 m² 計，請輸入身高</p>
              )}
              {res && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-0.5"><I.book className="w-3.5 h-3.5 text-slate-400" />手冊原文 · ref {drug.ref}</div>
                      <div className="font-mono text-xs text-slate-700">
                        {reg.value != null ? asRange(reg.value).join("–") + " " : ""}{reg.unit} · {reg.freq}
                        {reg.max ? ` · Max ${fmt(reg.max.mg, reg.mcg)}/${reg.max.per === "dose" ? "劑" : "日"}` : ""}
                      </div>
                    </div>
                    <div className="border-t border-dashed border-slate-200 pt-2">
                      <div className="text-[11px] text-slate-500 mb-0.5">套入本病人</div>
                      <div className="font-mono text-xs text-slate-700">{res.work}</div>
                    </div>
                  </div>

                  {res.loading && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-[11px] text-slate-500">首劑 Loading</span>
                      <div className="text-base font-mono font-semibold text-slate-900">{res.loading}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-lg px-3 py-2.5 ${C.card}`}>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        每劑 {res.cappedDose && <span className="text-amber-600 flex items-center gap-0.5"><I.alert className="w-3 h-3" />封頂</span>}
                      </span>
                      <div className={`text-lg font-mono font-semibold ${res.cappedDose ? "text-amber-700" : "text-slate-900"}`}>{rng(res.doseMin, res.doseMax, reg.mcg)}</div>
                      <span className="text-[11px] text-slate-400">{reg.freq}</span>
                    </div>
                    <div className="rounded-lg px-3 py-2.5 bg-slate-50">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        每日總量 {res.cappedDay && <span className="text-amber-600 flex items-center gap-0.5"><I.alert className="w-3 h-3" />封頂</span>}
                      </span>
                      <div className={`text-lg font-mono font-semibold ${res.cappedDay ? "text-amber-700" : "text-slate-900"}`}>
                        {res.dayMin == null ? <span className="text-sm text-slate-400">依適應症</span> : rng(res.dayMin, res.dayMax, reg.mcg)}
                      </div>
                      {reg.max && <span className="text-[11px] text-slate-400">Max {fmt(reg.max.mg, reg.mcg)}/{reg.max.per === "dose" ? "劑" : "日"}</span>}
                    </div>
                  </div>

                  {reg.note && (
                    <div className={`flex items-start gap-1.5 text-xs rounded-lg px-3 py-2 ${reg.warn ? "text-amber-800 bg-amber-50 border border-amber-200" : "text-slate-600 bg-slate-50"}`}>
                      {reg.warn ? <I.alert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" /> : <I.info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />}<span>{reg.note}</span>
                    </div>
                  )}
                  {reg.selfPay && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      <I.dollar className="w-3.5 h-3.5" /> 多為自費，開立請選「自備」
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 mt-5 leading-relaxed">
          決策輔助工具，不取代臨床判斷與處方查證；所有劑量請與主治確認後開立。腎/肝功能調整尚未納入。
          未收錄：p.26 Penicillins、p.36 Palivizumab / CMV-IVIG / Ribavirin / Oseltamivir（照片未提供）。
        </p>
      </div>
    </div>
  );
}
