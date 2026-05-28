# Block-to-Script LMS — Project Overview

## 專案是什麼

Block-to-Script 敘事導向之 Roblox Studio 智慧學習管理系統。  
專為國中小程式初學者設計，透過「先概念建構（Blockly 積木）→ 後受限實作（克漏字 Lua + Roblox Studio）」的階段式學習流程，降低 3D 遊戲引擎的學習門檻。

核心流程：  
閱讀教材 → 互動章節 (READING/BLOCKLY/CLOZE/PRACTICE) → Roblox Studio 實作 → Webhook 事件解鎖下一課

---

## Current Architecture

### 前端（React + Vite + TypeScript）

```
frontend/  (:5173)
├── React Router 路由
├── Zustand 狀態管理（authStore, student_token）
├── axios interceptor（讀取 auth-storage）
├── Blockly 自訂積木（10 種，含 Lua generator）
├── WebSocket 串接 AI 工地主任
├── AiTutorPanel（STT + TTS bufferSpeak）
└── Tailwind CSS（v4）
```

### 後端（Python FastAPI + SQLAlchemy + SQLite）

```
backend/  (:8001)
├── FastAPI 應用
├── SQLAlchemy 2.0 async engine（aiosqlite）
├── Alembic migration
├── JWT 驗證中介層
├── Webhook 事件驅動解鎖
├── AI Tutor WebSocket（OpenAI + 背景干預檢查器）
└── RESTful API
```

---

## Important Decisions

| 決策 | 說明 |
|------|------|
| **Chapter 資料表** | 章節從 inline fields 改為獨立 `Chapter` 資料表，支援 READING, BLOCKLY, CLOZE, PRACTICE 類型 |
| **事件驅動解鎖** | Webhook 使用 `event` 代碼 (e.g. `EVENT_ENV_TEST_COMPLETED`)，更具語意化且與 `Course.unlockEvent` 對應 |
| **非 Webhook 課程連鎖解鎖** | 無 `unlockEvent` 的課程（如純閱讀章節），在 PATCH 完成所有章節後自動解鎖下一課/下一主題 |
| **student_token** | 全站統一使用 `student_token`（UUID），註冊時產生永不變，貼入 Roblox Studio 供 Webhook 驗證 |
| **SQLAlchemy + aiosqlite** | 純 Python 非同步驅動，解決 Windows 路徑相容性問題 |
| **ES Module 相容 Generator** | Blockly Lua generator 用 `const Lua = ...` 而非 `Blockly.Lua = ...`（Vite ES module 不可對 import 賦值） |
| **密碼安全** | bcrypt 單向 hash，教師可重設密碼但無法檢視原始密碼 |

## 名詞對照

| 層級 | DB Table | 說明 | 範例 |
|------|----------|------|------|
| **主題** (Topic) | `topics` | 最大的分類，像一本書的單元 | 準備篇、主題一 |
| **課程** (Course) | `courses` | 主題底下的各堂課 | 下載與安裝、為車子製作跳台 |
| **章節** (Chapter) | `chapters` | 課程內的細分步驟，有不同互動型態 | 開始 (READING)、積木測驗 (BLOCKLY) |

---

## 教材完整規劃

詳細的教學內容、Blockly 邏輯、實作目標與各章節詳解，請參閱：
👉 **[CURRICULUM.md](./CURRICULUM.md)**

---

## DB Schema

```sql
users            (id, username, password, role, student_token, createdAt)
topics           (id, title, description, orderIndex)
courses          (id, topicId, title, orderIndex, rbxlUrl, unlockEvent)
chapters         (id, courseId, title, orderIndex, type[READING|BLOCKLY|CLOZE|PRACTICE],
                   content, blocklyAnswer, luaCode, luaAnswers)
learning_records (id, userId, courseId, status[LOCKED|UNLOCKED|COMPLETED],
                   chapters[JSON: {chapter_id: true}], updatedAt)
behavior_logs    (id, userId, courseId, actionType, detail, duration, createdAt)
```

---

## API Endpoints

| 路由 | 方法 | 功能 | Auth |
|------|------|------|------|
| `/api/auth/register` | POST | 註冊 | 無 |
| `/api/auth/login` | POST | 登入（回傳 JWT + student_token） | 無 |
| `/api/topics` | GET | 主題列表 | 無 |
| `/api/topics/{id}/courses` | GET | 主題內課程列表（含解鎖狀態） | JWT |
| `/api/courses/{id}` | GET | 單一課程內容（含 Chapters 列表） | JWT |
| `/api/courses/{id}/chapters` | PATCH | 更新單一章節完成狀態 | JWT |
| `/api/webhook/unlock` | POST | Roblox 通關訊號（驗證 student_token + event） | Token |
| `/api/webhook/ping` | GET | 連線測試 | 無 |
| `/api/tracking` | POST | 前端行為數據上傳 | JWT |
| `/api/ai-tutor/chat` | WS | AI 工地主任 WebSocket | JWT |
| `/api/admin/students` | GET | 學生列表 | JWT(teacher) |
| `/api/admin/students/{id}/stats` | GET | 學生詳細統計 | JWT(teacher) |
| `/api/admin/students/{id}` | DELETE | 刪除學生帳號 | JWT(teacher) |
| `/api/admin/students/{id}/reset-password` | POST | 重設學生密碼 | JWT(teacher) |
| `/api/admin/students/{id}/unlock-all` | POST | 解鎖學生全部課程（破解版） | JWT(teacher) |
| `/api/admin/courses` | POST/PUT/DELETE | 課程 CRUD | JWT(teacher) |

---

## Completed Features

- [x] Chapter 資料表 + 四種章節類型（READING/BLOCKLY/CLOZE/PRACTICE）
- [x] 動態前端渲染（SetupPage 6 步驟 wizard、CoursePage 依 chapter type 切換 UI）
- [x] 事件驅動 Webhook（`POST /api/webhook/unlock` + event name）
- [x] 章節進度持久化（`PATCH /api/courses/{id}/chapters`）
- [x] 已完成章節可自由點選回顧（導覽列 ✅ 標示）
- [x] 準備篇互動式設定精靈（SetupPage）
- [x] **Blockly 擴充至 10 顆積木**（事件：event_touch, event_heartbeat, event_game_start；動作：decrease_hp, play_sound, teleport, rotate；控制：wait, repeat；邏輯：if）
- [x] **Lua Generator**（10 顆積木均可在 `luaGenerators.ts` 產生對應 Lua 程式碼）
- [x] 克漏字 Lua 填空 UI（LuaCodeBlock）
- [x] 種子資料完整（3 主題 × 6 課程 × 26 章節）
- [x] T1C1 章節 3/4 對調（ch3: 編輯零件 READING → ch4: 跳台製作 PRACTICE）
- [x] T2C3 ch2 積木測驗答案修正（event_heartbeat → rotate 對應心跳旋轉）
- [x] TutorialGuide.lua v3（HttpService.Timeout=5, debounce, POST /api/webhook/unlock）
- [x] AI Tutor WebSocket（OpenAI 串流、背景干預檢查器 60s loop、JSON 訊息格式）
- [x] AiTutorPanel（STT 麥克風、TTS bufferSpeak 句子級朗讀、shake 干預動畫、語音開關）
- [x] 教師管理後台（學生列表、刪除帳號、重設密碼、解鎖全部課程）
- [x] 啟用前後端 palette（#F8FAFC / #D9EAFD / #BCCCDC / #9AA6B2 / white）

---

## Current State & Pending Items

| 項目 | 狀態 | 備註 |
|------|------|------|
| 1_CarJump.rbxl 製作 | 🟢 **已上架** | 放在 `frontend/public/1_CarJump.rbxl`，學生可下載 |
| Webhook 實機測試 | 🟢 **已通過** | Roblox Studio 可送出 HTTP 請求，成功解鎖下一課程 |
| T1C1 ch4 檢查解鎖按鈕 | 🟢 **已新增** | 實作挑戰章節底部有「檢查 Webhook 解鎖狀態」按鈕 |
| AI 整合學生行為數據 | 🔴 **未實作** | AI 目前只靠 system prompt，未讀取 behavior_logs 給予個人化回饋 |
| AI 主動說話 | 🔴 **未實作** | intervention_checker 存在但內部是空的，未觸發 proactive 訊息 |

---

## Next Steps

### 短期（優先處理）

1. **AI 整合學生行為數據**
   - 在 `ai_tutor.py` 的 WebSocket 連線時讀取該學生的 `behavior_logs`
   - 將行為摘要加入 system prompt（如：「該學生在積木測驗答錯 3 次、提出 2 次 AI 詢問」）
   - 使 AI 能根據學生歷史給個人化建議

2. **AI 主動干預**
   - 實作 `intervention_checker` 邏輯：查詢該學生當前課程的進度停滯時間
   - 特定條件觸發時（如某章節停留 > 5 分鐘），透過 WebSocket 送出 `{type:"intervention", message:"...」}`

3. **擴增克漏字章節** — 目前只有 T2C3 ch3 一題克漏字，可新增更多（如 T1C1 ch3 編輯工具相關填空）

### 中期

4. **教師管理課程 UI** — 使用現有 CRUD endpoint 建置課程/章節編輯頁面
5. **學生儀表板** — 進度條、統計圖表
6. **更多教材內容** — 依據 CURRICULUM.md 擴充主題三以後內容

---

## 啟動方式

```bash
# 清 port
npx kill-port 8001 5173

# 終端機 1 — 後端（port 8001）
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8001

# 終端機 2 — 前端
cd frontend
npm run dev
```

前端：`http://localhost:5173`  
後端 API：`http://127.0.0.1:8001`  
API 文件：`http://127.0.0.1:8001/docs`  
測試帳號：`teacher / 123456`、`student / 123456`、`demo / 123456`
