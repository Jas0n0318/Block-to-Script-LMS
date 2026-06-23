# Block-to-Script LMS — 教材規劃與架構

本文件定義了專案中所有的教學內容、Blockly 邏輯與實作目標。Agent 在開發 `seed.py` 或建置前端教材時，應嚴格遵循此文件的細節。

## 章節類型

| 類型 | 說明 | 前端元件 | 驗證方式 |
|------|------|---------|---------|
| **READING** | 純閱讀教材，含 Markdown 內容 | ReactMarkdown | 點擊「完成學習」按鈕 |
| **BLOCKLY** | 積木測驗，學生拼出指定積木組合 | BlocklyWorkspace | 自動比對 XML（去除 ID/X/Y） |
| **CLOZE** | 克漏字 Lua 填空 | LuaCodeBlock | 比對填空答案（JSON 陣列） |
| **PRACTICE** | 實作挑戰，通常導向 Roblox Studio | 提示文字 + 下載連結 | Webhook 或前端點擊完成 |

---

## 課程結構總覽

```
├── 準備篇：下載與安裝 (orderIndex=0)
│   └── 課程：下載與安裝（影片教學腳本規劃）
│       ├── ch1: 開始 (READING)
│       ├── ch2: Roblox 影片教學 (READING)
│       ├── ch3: Roblox Studio 影片教學 (READING)
│       ├── ch4: 下載 0_EnvironmentTest.rbxl (PRACTICE)
│       ├── ch5: 測試 0_EnvironmentTest.rbxl 流程 (PRACTICE)
│       └── ch6: 完成 (READING)
│
├── 主題一：Roblox Studio 新手村 (orderIndex=1)
│   ├── 課程 1：為車子製作跳台 (Webhook: EVENT_T1_C1_COMPLETED)
│   │   ├── ch1: 移動與視角 (READING)
│   │   ├── ch2: 工具箱 (READING)
│   │   ├── ch3: 編輯零件 (READING)
│   │   └── ch4: 跳台製作 (PRACTICE)
│   │
│   └── 課程 2：介面與功能 (非 Webhook，前端完成)
│       ├── ch1: 認識介面 (READING)
│       ├── ch2: 總管介紹 (READING)
│       └── ch3: 快捷鍵 (READING)
│
├── 主題二：跑酷製作 (orderIndex=2)
│   ├── 課程 1：專案認識 (Webhook: EVENT_T2_C1_CH3_COMPLETED)
│   │   ├── ch1: 專案說明 (READING)
│   │   ├── ch2: 試玩示範跑道 (PRACTICE)
│   │   └── ch3: 出生點介紹 (READING)
│   │
│   ├── 課程 2：到達另一端 (Webhook: EVENT_T2_C2_COMPLETED)
│   │   ├── ch1: 新增物體並錨定 (READING)
│   │   ├── ch2: 空間三軸 (READING)
│   │   ├── ch3: 網格與模型 (READING)
│   │   └── ch4: 鋪路 跳到另一端 (PRACTICE)
│   │
│   └── 課程 3：旋轉機關 (Webhook: EVENT_T2_C3_COMPLETED)
│       ├── ch1: 旋轉機關原理 (READING)
│       ├── ch2: 積木測驗 (BLOCKLY)
│       ├── ch3: 程式碼說明與複製 (CLOZE)
│       ├── ch4: 加上腳本並調整 (READING)
│       └── ch5: 達成要求 (PRACTICE)
```

---

## 準備篇：下載與安裝

| 項目 | 內容 |
| :--- | :--- |
| **課程名稱** | 下載與安裝（影片教學腳本規劃） |
| **教學目標** | 確保軟體環境就緒，引導學生熟悉平台與 Roblox 專案的互動模式（Webhook 解鎖機制）。 |
| **章節規劃** | 1. 開始 / 2. Roblox 影片教學 / 3. Roblox Studio 影片教學 / 4. 下載 0_EnvironmentTest.rbxl / 5. 測試流程 / 6. 完成 |
| **對應檔案** | `0_EnvironmentTest.rbxl` |
| **Webhook 觸發機制** | `EVENT_ENV_TEST_COMPLETED` — 學生進入遊戲，依照提示完成 WASD、跳躍、視角轉動後抵達終點，踩上隱形方塊發送 Webhook，解鎖主題一。 |

---

## 主題一：Roblox Studio 新手村

| 課程 | 教學目標 | 實作重點與對應檔案 | 驗證與解鎖機制 |
| :--- | :--- | :--- | :--- |
| **1. 為車子製作跳台** | 熟悉視角控制、Toolbox 使用，並理解基礎零件編輯與 Anchor 概念。 | **`1_CarJump.rbxl`**<br>- 從 Toolbox 找尋跳台或木板<br>- 移動、縮放零件<br>- 開啟 Anchor 錨定 | **Webhook `EVENT_T1_C1_COMPLETED`**<br>學生成功搭建跳台讓車子飛越峽谷抵達終點，觸發解鎖下一課。 |
| **2. 介面與功能** | 建立對 Studio 開發環境的全局觀（Explorer、Properties）與高效操作（快捷鍵）。 | **無專案實作**<br>純圖文教材引導 | **前端完成**<br>閱讀所有章節後，前端 API 自動解鎖下一課。 |

---

## 主題二：跑酷製作

| 課程 | 教學目標 | 實作重點 | Blockly / 克漏字 | 驗證與解鎖機制 |
| :--- | :--- | :--- | :--- | :--- |
| **1. 專案認識** | 理解跑酷遊戲架構，認識 SpawnLocation。 | **`2_Parkour.rbxl`**<br>- 試玩預設跑道<br>- 觀察出生點特性 | ❌ | **Webhook `EVENT_T2_C1_CH3_COMPLETED`** |
| **2. 到達另一端** | 活用空間三軸與網格概念，自行鋪設跑酷路徑。 | **`2_Parkour.rbxl` (延續)**<br>- 新增物體、建構橋樑<br>- 填入專屬 Token | ❌ | **Webhook `EVENT_T2_C2_COMPLETED`**<br>走到終點發送帶有 Token 的 Webhook |
| **3. 旋轉機關** | 首次接觸程式邏輯，理解迴圈與旋轉指令。 | **`2_Parkour.rbxl` (延續)**<br>- 在障礙物加入 Script<br>- 調整旋轉速度 | **Blockly：** 心跳 + 旋轉積木<br>**克漏字：** 取得 Lua 腳本 | **Webhook `EVENT_T2_C3_COMPLETED`**<br>通過旋轉機關抵達終點 |

---

## 未來課程規劃（未實作）

### 主題三：條件與變數（規劃中）

| 課程 | 教學目標 | Blockly / 克漏字 |
| :--- | :--- | :--- |
| **1. 致命陷阱** | 理解 `if` 條件判斷與 `Touched` 事件搭配 | Blockly：event_touch + if + decrease_hp |
| **2. 傳送門** | 使用 `CFrame` 與 `Teleport` 實現傳送機制 | 克漏字：取得傳送 Lua 腳本 |
| **3. 音效機關** | 使用 `PlaySound` 與觸發事件 | Blockly：event_touch + play_sound |

---

## 資料欄位對照表

| 欄位 | 說明 |
| :--- | :--- |
| `blocklyAnswer` | 儲存標準 XML 格式，比對時會去除中繼資料 (ID, X, Y) |
| `luaCode` | 原始碼，填空處使用 `______` 表示 |
| `luaAnswers` | JSON 陣列，例如 `["0.01", "loop"]` |
| `rbxlUrl` | 放置於 `frontend/public/` 的檔案路徑 |

---

## 完整 DB Schema

```sql
users              (id, username, password, role, student_token, createdAt)
topics             (id, title, description, orderIndex)
courses            (id, topicId, title, orderIndex, rbxlUrl, unlockEvent)
chapters           (id, courseId, title, orderIndex, type[READING|BLOCKLY|CLOZE|PRACTICE],
                      content, blocklyAnswer, luaCode, luaAnswers)
learning_records   (id, userId, courseId, status[LOCKED|UNLOCKED|COMPLETED],
                      chapters[JSON], updatedAt)
behavior_logs      (id, userId, courseId, actionType, detail, duration, createdAt)
study_notes        (id, userId, chapterId, content, createdAt, updatedAt)
                     -- UNIQUE(userId, chapterId)
chapter_feedback   (id, userId, chapterId, rating, difficulty, comment, createdAt)
                     -- UNIQUE(userId, chapterId), CHECK(rating/difficulty 1-5)
learning_goals     (id, userId, weeklyTarget, startDate, endDate, createdAt)
                     -- CHECK(weeklyTarget > 0), CHECK(endDate > startDate)
```

---

## Webhook 解鎖邏輯

- **Endpoint:** `POST /api/webhook/unlock`
- **Payload:** `{ "token": "<student_token>", "event": "<event_name>" }`
- **流程：**
  1. 透過 `token` 找到對應的 `User`
  2. 透過 `event` 找到對應的 `Course`（比對 `Course.unlockEvent`）
  3. 將該 Course 的 `LearningRecord.status` 設為 `COMPLETED`
  4. 同步將該 Course 所有章節設為完成
  5. **連鎖解鎖：** 自動解鎖同一 Topic 的下一個 Course，若本主題結束則解鎖下一主題的第一個 Course
- **冪等性：** 若已 COMPLETED 則直接跳過

> **非 Webhook 課程：** 無 `unlockEvent` 的課程（如純閱讀章節），在 `PATCH /api/courses/{id}/chapters` 完成所有章節後，自動觸發 `cascade_unlock`。
