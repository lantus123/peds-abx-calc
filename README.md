# 抗生素計算機

> 兒科常用抗生素自動計算（治療 + 預防）
> 來源：兒血/兒癌科抗感染藥物手冊 p.27–35 + FN 預防表

## 線上版

部署後網址：`https://<你的帳號>.github.io/peds-abx-calc/`

## 本機開發

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # 產出 dist/
npm run preview      # 預覽 build 結果
```

## 部署（自動）

push 到 `main` 分支 → GitHub Actions 自動 build + deploy 到 Pages。

首次設定：
1. GitHub repo → **Settings → Pages**
2. **Source** 改成 **GitHub Actions**（不是 Deploy from branch）
3. 之後 push 自動發布

## 修改藥物資料

只改 `src/App.jsx` 裡的 `DRUGS` array：
- `basis`: `weight` | `bsa` | `fixed` | `wtTable`
- `mode`: `perDose` | `perDay`
- `value` / `doses`: number 或 `[min, max]`
- `max`: `{ per: 'dose' | 'day', mg: N }`

push 後約 1-2 分鐘自動上線。

## 嵌入 Google Sites

Google Sites → 插入 → 內嵌 → 貼網址：
```
https://<你的帳號>.github.io/peds-abx-calc/
```

## 待辦

- [ ] renal / hepatic adjust
- [ ] 補 p.26 Penicillins (PCN G/V, Amox, Ampi, Oxa, Diclox)
- [ ] 補 p.36 Palivizumab / CMV-IVIG / Ribavirin / Oseltamivir

## 免責聲明

決策輔助工具，不取代臨床判斷與處方查證。所有劑量請與主治確認後開立。
