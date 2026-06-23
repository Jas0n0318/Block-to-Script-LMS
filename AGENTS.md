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
├── React Router 路由（7 頁面）
├── Zustand 狀態管理（authStore, student_token）
├── axios interceptor（讀取 auth-storage）
├── Blockly 自訂積木（10 種，含 Lua generator）
├── WebSocket 串接 AI 工地主任
├── AiTutorPanel（STT + TTS bufferSpeak）
├── 學習筆記 UI（CoursePage 底部）
├── 章節回饋 UI（最後一章底部）
├── 學生學習進度頁（DashboardPage）
├── 教師學生管理（StudentListPage + AnalyticsPage）
└── Tailwind CSS（v4）
```

### 後端（Python FastAPI + SQLAlchemy + SQLite）

```
backend/  (:8001)
├── FastAPI 應用
├── SQLAlchemy 2.0 async engine（aiosqlite）
├── JWT 驗證中介層
├── Webhook 事件驅動解鎖
├── AI Tutor WebSocket（OpenAI + 行為數據整合 + 背景干預檢查器）
├── RESTful API（auth, topics, courses, tracking, notes, feedback, goals, admin）
└── Seed 資料（3 主題 × 6 課程 × 26 章節 + 範例資料）
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
| **行為數據整合** | AI 在每次對話時自動讀取 `behavior_logs`，統計錯誤次數、停留時間、完成類型等，加入 system prompt |
| **學習目標單一化** | 每人只能設定一個學習目標，避免重複衝突 |
| **老師端合併顯示** | AnalyticsPage 統一顯示課程進度、章節完成數、回饋、筆記、目標 |

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
users              (id, username, password, role, student_token, createdAt)
topics             (id, title, description, orderIndex)
courses            (id, topicId, title, orderIndex, rbxlUrl, unlockEvent)
chapters           (id, courseId, title, orderIndex, type[READING|BLOCKLY|CLOZE|PRACTICE],
                      content, blocklyAnswer, luaCode, luaAnswers)
learning_records   (id, userId, courseId, status[LOCKED|UNLOCKED|COMPLETED],
                      chapters[JSON: {chapter_id: true}], updatedAt)
behavior_logs      (id, userId, courseId, actionType, detail, duration, createdAt)
study_notes        (id, userId, chapterId, content, createdAt, updatedAt)  -- UNIQUE(userId, chapterId)
chapter_feedback   (id, userId, chapterId, rating, difficulty, comment, createdAt)
                     -- UNIQUE(userId, chapterId), CHECK(rating 1-5), CHECK(difficulty 1-5)
learning_goals     (id, userId, weeklyTarget, startDate, endDate, createdAt)
                     -- CHECK(weeklyTarget > 0), CHECK(endDate > startDate)
```

---

## API Endpoints

| 路由 | 方法 | 功能 | Auth |
|------|------|------|------|
| `/api/auth/register` | POST | 註冊（自動建立 LearningRecord） | 無 |
| `/api/auth/login` | POST | 登入（回傳 JWT + student_token） | 無 |
| `/api/topics` | GET | 主題列表 | 無 |
| `/api/topics/{id}/courses` | GET | 主題內課程列表（含解鎖狀態） | JWT |
| `/api/courses/{id}` | GET | 單一課程內容（含 Chapters + 完成狀態） | JWT |
| `/api/courses/{id}/chapters` | PATCH | 更新單一章節完成狀態（自動檢查課程完成 + 級聯解鎖） | JWT |
| `/api/webhook/unlock` | POST | Roblox 通關訊號（驗證 student_token + event） | Token |
| `/api/webhook/ping` | GET | 連線測試 | 無 |
| `/api/tracking` | POST | 前端行為數據上傳（batch） | JWT |
| `/api/ai-tutor/chat` | WS | AI 工地主任 WebSocket（含 behavior_logs 整合 + intervention_checker） | JWT |
| `/api/notes` | GET/POST | 學習筆記列表/新增 | JWT |
| `/api/notes/{id}` | PUT/DELETE | 學習筆記更新/刪除 | JWT |
| `/api/chapters/{id}/feedback` | GET/POST | 章節回饋查詢/提交 | JWT |
| `/api/goals` | GET/POST | 學習目標列表/新增（限 1 個） | JWT |
| `/api/goals/{id}` | PUT/DELETE | 學習目標更新/刪除 | JWT |
| `/api/admin/students` | GET | 學生列表（含統計） | JWT(teacher) |
| `/api/admin/students/{id}/stats` | GET | 學生詳細統計（含進度、回饋、筆記、目標） | JWT(teacher) |
| `/api/admin/students/{id}` | DELETE | 刪除學生帳號（含關聯資料） | JWT(teacher) |
| `/api/admin/students/{id}/reset-password` | POST | 重設學生密碼 | JWT(teacher) |
| `/api/admin/students/{id}/unlock-all` | POST | 解鎖學生全部課程 | JWT(teacher) |
| `/api/admin/courses` | POST | 新增課程 | JWT(teacher) |
| `/api/admin/courses/{id}` | PUT/DELETE | 更新/刪除課程 | JWT(teacher) |

---

## Completed Features

### 核心學習流程
- [x] Chapter 資料表 + 四種章節類型（READING/BLOCKLY/CLOZE/PRACTICE）
- [x] 動態前端渲染（SetupPage 6 步驟 wizard、CoursePage 依 chapter type 切換 UI）
- [x] 事件驅動 Webhook（`POST /api/webhook/unlock` + event name + 冪等處理）
- [x] 章節進度持久化（`PATCH /api/courses/{id}/chapters` + JSON progress）
- [x] 已完成章節可自由點選回顧（導覽列 ✅ 標示）
- [x] 非 Webhook 課程自動級聯解鎖（cascade_unlock）

### Blockly & 程式教育
- [x] Blockly 擴充至 10 顆積木（事件：event_touch, event_heartbeat, event_game_start；動作：decrease_hp, play_sound, teleport, rotate；控制：wait, repeat；邏輯：if）
- [x] Lua Generator（10 顆積木均可在 `luaGenerators.ts` 產生對應 Lua 程式碼）
- [x] 克漏字 Lua 填空 UI（LuaCodeBlock）

### 種子資料
- [x] 種子資料完整（3 主題 × 6 課程 × 26 章節）
- [x] T1C1 章節 3/4 對調（ch3: 編輯零件 READING → ch4: 跳台製作 PRACTICE）
- [x] T2C3 ch2 積木測驗答案修正（event_heartbeat → rotate 對應心跳旋轉）
- [x] 範例資料：2 筆學習筆記、1 筆章節回饋、1 筆學習目標

### Roblox Studio 整合
- [x] TutorialGuide.lua v3（HttpService.Timeout=5, debounce, POST /api/webhook/unlock）
- [x] 1_CarJump.rbxl 製作（frontend/public/1_CarJump.rbxl）
- [x] Webhook 實機測試通過

### AI 工地主任
- [x] AI Tutor WebSocket（OpenAI 串流、JSON 訊息格式）
- [x] AiTutorPanel（STT 麥克風、TTS bufferSpeak 句子級朗讀、shake 干預動畫、語音開關）
- [x] **AI 整合行為數據**（_build_system_prompt 讀取 behavior_logs：統計錯誤次數、停留時間、各類型完成數、跨課程分析）
- [x] **AI 主動干預**（intervention_checker 60s 循環 + event-driven 觸發：連續錯誤、停留過久、Webhook 成功）

### 學習工具
- [x] 學習筆記（CoursePage 底部，新增/編輯/刪除）
- [x] 章節回饋（最後一章底部，星等 + 難度 + 留言）
- [x] 學習目標（DashboardPage，單一目標設定/編輯/刪除）
- [x] 學生學習進度頁（DashboardPage，總覽卡片 + 各主題進度條）

### 教師管理
- [x] 教師管理後台（學生列表、刪除帳號、重設密碼、解鎖全部課程）
- [x] 教師查看學生統計（AnalyticsPage：課程進度 + 章節數 + 回饋 + 筆記 + 目標 + 近期活動）
- [x] 後端課程 CRUD（POST/PUT/DELETE /api/admin/courses）

### 其他
- [x] 註冊時自動建立所有課程的 LearningRecord
- [x] 啟用前後端 palette（#F8FAFC / #D9EAFD / #BCCCDC / #9AA6B2 / white）
- [x] 前端行為追蹤（page_dwell, block_error, block_success, reading_done, cloze_done, practice_done, ai_query）
- [x] 學習目標單一化限制（後端 409 拒絕重複建立）
- [x] 老師端「課程進度」與學生端「學習進度」合併顯示

---

## Current State & Pending Items

| 項目 | 狀態 | 備註 |
|------|------|------|
| AI 整合行為數據 | 🟢 **已實作** | _build_system_prompt + _fetch_context 完整運作 |
| AI 主動干預 | 🟢 **已實作** | intervention_checker + event-driven 觸發 |
| 學習筆記/回饋/目標 | 🟢 **已實作** | 前後端 CRUD 完整 |
| 學生學習進度頁 | 🟢 **已實作** | DashboardPage（學習進度） |
| 老師端合併顯示 | 🟢 **已實作** | AnalyticsPage 顯示完整學生資料 |
| 擴增克漏字章節 | 🔴 **未實作** | 目前只有 T2C3 ch3 一題填空 |
| 教師管理課程 UI | 🔴 **未實作** | 後端 CRUD 已有，但缺前端編輯頁面 |
| 更多教材內容 | 🔴 **未實作** | 依據 CURRICULUM.md 擴充主題三以後內容 |

---

## Next Steps

### 短期（優先處理）

1. **擴增克漏字章節**
   - 目前僅 T2C3 ch3 一題克漏字填空
   - 可在 T1C1 ch3（編輯工具相關填空）或其他課程新增
   - 需同步更新 `seed.py` 與 `CURRICULUM.md`

2. **教師管理課程 UI**
   - 後端已有 `POST/PUT/DELETE /api/admin/courses`
   - 需建置教師專用的課程列表/章節編輯頁面
   - 可參考現有 `StudentListPage` 的管理風格

### 中期

3. **更多教材內容**
   - 依據 CURRICULUM.md 擴充主題三及以後的課程與章節
   - 需同步更新 `seed.py` 與 `CURRICULUM.md`

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
