# Block-to-Script LMS — 教材規劃與架構

本文件定義了專案中所有的教學內容、Blockly 邏輯與實作目標。Agent 在開發 `seed.py` 或建置前端教材時，應嚴格遵循此文件的細節。

---

```
├── 準備篇：下載與安裝
│   └── 課程：下載與安裝（影片教學腳本規劃）
│       ├── 章節 1：開始
│       ├── 章節 2：Roblox 影片教學
│       ├── 章節 3：Roblox Studio 影片教學
│       ├── 章節 4：下載 0_EnvironmentTest.rbxl
│       ├── 章節 5：測試 0_EnvironmentTest.rbxl 流程
│       └── 章節 6：完成
│
├── 主題一：Roblox Studio 新手村
│   ├── 課程 1：為車子製作跳台
│   │   ├── 章節 1：移動與視角
│   │   ├── 章節 2：工具箱
│   │   ├── 章節 3：編輯零件
│   │   └── 章節 4：跳台製作
│   │
│   └── 課程 2：介面與功能
│       ├── 章節 1：認識介面
│       ├── 章節 2：總管介紹
│       └── 章節 3：快捷鍵
│
├── 主題二：跑酷製作
│   ├── 課程 1：專案認識
│   │   ├── 章節 1：下載 2_Parkour.rbxl
│   │   ├── 章節 2：專案說明
│   │   ├── 章節 3：試玩示範跑道
│   │   └── 章節 4：出生點介紹
│   │
│   ├── 課程 2：到達另一端 (延續 2_Parkour.rbxl)
│   │   ├── 章節 1：新增物體並錨定
│   │   ├── 章節 2：空間三軸
│   │   ├── 章節 3：網格與模型
│   │   └── 章節 4：鋪路 跳到另一端 (填入 token 並解鎖下一課)
│   │
│   └── 課程 3：旋轉機關 (延續 2_Parkour.rbxl)
│       ├── 章節 1：旋轉機關原理
│       ├── 章節 2：積木測驗
│       ├── 章節 3：程式碼說明與複製
│       ├── 章節 4：加上腳本並調整
│       └── 章節 5：達成要求 (至少要碰到一個會旋轉的物體 並跳到另一端)
```

---

## 準備篇：下載與安裝

| 項目 | 內容 |
| :--- | :--- |
| **課程名稱** | 下載與安裝（影片教學腳本規劃） |
| **教學目標** | 確保軟體環境就緒，引導學生熟悉平台與 Roblox 專案的互動模式（Webhook 解鎖機制）。 |
| **章節規劃** | 1. 開始 / 2. Roblox 影片教學 / 3. Roblox Studio 影片教學 / 4. 下載 0_EnvironmentTest.rbxl / 5. 測試 0_EnvironmentTest.rbxl 流程 / 6. 完成 |
| **對應檔案** | `0_EnvironmentTest.rbxl` |
| **Webhook 觸發機制** | 學生進入遊戲，依照提示圖完成 WASD、跳躍、視角轉動後抵達終點，踩上隱形方塊發送 Webhook，**解鎖主題一**。 |

---

## 主題一：Roblox Studio 新手村

| 課程 | 教學目標 | 實作重點與對應檔案 | 驗證與解鎖機制 (Precondition) |
| :--- | :--- | :--- | :--- |
| **1. 為車子製作跳台** | 熟悉視角控制、Toolbox 使用，並理解基礎零件編輯與 Anchor 概念。 | **`1_CarJump.rbxl`**<br>- 從 Toolbox 找尋跳台或木板<br>- 移動、縮放零件<br>- 開啟 Anchor 錨定 | **遊戲終點預埋腳本：**<br>學生成功搭建跳台並讓車子飛越峽谷抵達終點，觸發 Webhook，**解鎖課程 2**。 |
| **2. 介面與功能** | 建立對 Studio 開發環境的全局觀（Explorer、Properties）與高效操作（快捷鍵）。 | **無專案實作**<br>純圖文/影片教材引導 | **平台互動解鎖：**<br>學生閱讀完所有章節後，點擊平台上的「完成學習」按鈕，發送 API 紀錄，**解鎖主題二**。 |

---

## 主題二：跑酷製作

| 課程 | 教學目標 | 實作重點與對應檔案 | Blockly / 克漏字 | 驗證與解鎖機制 |
| :--- | :--- | :--- | :--- | :--- |
| **1. 專案認識** | 理解跑酷遊戲架構，認識 SpawnLocation (出生點)。 | **`2_Parkour.rbxl`**<br>- 試玩預設跑道<br>- 觀察出生點特性 | ❌ | 單純引導與觀察，透過點擊平台「完成章節」進入下一課。 |
| **2. 到達另一端** | 活用空間三軸與網格概念，自行鋪設跑酷路徑。 | **`2_Parkour.rbxl` (延續)**<br>- 新增物體、建構橋樑<br>- 填入專屬 Token | ❌ | 學生需在終點方塊的預設腳本中填入自己平台的 Token。走到終點發送帶有 Token 的 Webhook，**解鎖課程 3**。 |
| **3. 旋轉機關** | 首次接觸程式邏輯，理解迴圈或旋轉指令，並實際運用於遊戲中。 | **`2_Parkour.rbxl` (延續)**<br>- 在障礙物加入 Script<br>- 調整旋轉速度與方向 | **Blockly：** 迴圈與旋轉邏輯<br>**克漏字：** 取得 Lua 腳本 | 學生在平台完成 Blockly 與克漏字解鎖腳本後，貼入專案中。成功通過旋轉機關抵達最終終點，發送 Webhook，**完成本主題**。 |

---

## 資料欄位對照表 (供 Agent 實作用)

| 欄位 | 說明 |
| :--- | :--- |
| `blocklyAnswer` | 儲存標準 XML 格式，比對時會去除中繼資料 (ID, X, Y) |
| `luaCode` | 原始碼，填空處使用 `______` 表示 |
| `luaAnswers` | JSON 陣列，例如 `["10"]` 或 `["Sound"]` |
| `rbxlUrl` | 放置於 `frontend/public/` 的檔案路徑 |

# Block-to-Script LMS — 系統架構與資料庫種子藍圖 (Agent 指南)

本文件定義了 LMS 系統的資料庫關聯、Webhook 處理邏輯，以及核心課程的具體資料內容。
請 Agent 在撰寫 `models.py`、API Router 以及 `seed.py` 時，嚴格依據此文件實作。

## 1. 資料庫關聯與欄位定義 (Database Schema)

* **User (使用者)**
  * `id`: PK
  * `username`: String
  * `student_token`: String (Unique, LMS 生成給學生的專屬 Token，用於 Roblox Webhook 驗證)
* **Topic (主題)**
  * `id`: PK
  * `title`: String
  * `order`: Integer
* **Course (課程)**
  * `id`: PK
  * `topic_id`: FK (Topic)
  * `title`: String
  * `order`: Integer
  * `rbxlUrl`: String (存放於 `/frontend/public/` 的檔案路徑)
* **Chapter (章節)**
  * `id`: PK
  * `course_id`: FK (Course)
  * `title`: String
  * `type`: Enum ('READING', 'BLOCKLY', 'CLOZE', 'PRACTICE')
  * `content`: Text (Markdown 內容或 Blockly/Lua JSON)
* **LearningRecord (學習紀錄)**
  * `id`: PK
  * `user_id`: FK (User)
  * `course_id`: FK (Course)
  * `status`: Enum ('LOCKED', 'UNLOCKED', 'COMPLETED')

## 2. Webhook 解鎖邏輯 (Webhook API Specification)

* **Endpoint:** `POST /api/webhook/unlock`
* **Payload 格式:** `{ "token": "<student_token>", "event": "<event_name>" }`
* **處理邏輯 (重要)：**
  1. 透過 `token` 找到對應的 `User`。
  2. 透過 `event` 找到對應的 `Course`。
  3. 將該 Course 在 `LearningRecord` 的 status 設為 `COMPLETED` (需處理冪等性，若已完成則忽略)。
  4. **連鎖解鎖：** 自動尋找該 Topic 下的下一個 Course，將其 status 更新為 `UNLOCKED`。若本主題結束，則解鎖下一個 Topic 的第一個 Course。

---

## 3. 教材內容與實體資料 (Seed Data)

### 準備篇：下載與安裝
* **對應檔案：** `0_EnvironmentTest.rbxl`
* **解鎖事件 (Event)：** `EVENT_ENV_TEST_COMPLETED`
* **課程規劃：**
  * 章節 1：Roblox 影片教學 (`type: READING`)
  * 章節 2：Roblox Studio 影片教學 (`type: READING`)
  * 章節 3：測試 0_EnvironmentTest.rbxl 流程 (`type: PRACTICE`)

---

### 主題一：Roblox Studio 新手村
* **解鎖條件：** 準備篇的 LearningRecord 狀態為 `COMPLETED`。

#### 課程 1：為車子製作跳台
* **對應檔案：** `1_CarJump.rbxl`
* **解鎖事件 (Event)：** `EVENT_T1_C1_COMPLETED`
* **內容實作重點：**
  * 沒有 Blockly 與 Lua 實作。
  * 終點預埋 Webhook 腳本，學生需用 Move 與 Scale 工具搭建跳台，並開啟 Anchor，讓車子飛越後觸發。

#### 課程 2：介面與功能
* **對應檔案：** 無專案實作
* **解鎖機制：** 前端點擊按鈕直接呼叫 API 完成。無 Webhook 觸發。
* **內容實作重點：**
  * 章節 1~3 皆為 `type: READING`，介紹總管與快捷鍵。

---

### 主題二：跑酷製作
* **解鎖條件：** 主題一的所有課程狀態為 `COMPLETED`。

#### 課程 1：專案認識
* **對應檔案：** `2_Parkour.rbxl`
* **解鎖機制：** 前端點擊按鈕直接呼叫 API 完成。無 Webhook 觸發。

#### 課程 2：到達另一端 (延續 2_Parkour.rbxl)
* **對應檔案：** `2_Parkour.rbxl`
* **解鎖事件 (Event)：** `EVENT_T2_C2_COMPLETED`
* **內容實作重點：**
  * 學生需在 Roblox Studio 終點方塊的腳本中，填入 LMS 顯示的專屬 `student_token`，走到終點觸發 Webhook。

#### 課程 3：旋轉機關 (延續 2_Parkour.rbxl)
* **對應檔案：** `2_Parkour.rbxl`
* **解鎖事件 (Event)：** `EVENT_T2_C3_COMPLETED`
* **章節 2：積木測驗 (Blockly)**
  * `type: BLOCKLY`
  * `blocklyAnswer` (XML):
    ```xml
    <xml xmlns="https://developers.google.com/blockly/xml">
      </xml>
    ```
* **章節 3：程式碼說明與複製 (Lua 克漏字)**
  * `type: CLOZE`
  * `luaCode` (展示給學生的挖空代碼):
    ```lua
    local plane = script.Parent
    
    function loop ()
        plane.CFrame *= CFrame.Angles(0, ______, 0)
    end
    
    game:GetService('RunService').Heartbeat:Connect(______)
    ```
  * `luaAnswers` (JSON 解析解答): `["0.01", "loop"]`
