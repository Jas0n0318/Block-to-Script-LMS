import asyncio
import json
import bcrypt as bcr
from sqlalchemy import select
from database import async_session, init_db
from models import User, Topic, Course, Chapter, LearningRecord, UserRole, ChapterType, LearningStatus


async def seed():
    await init_db()
    async with async_session() as db:
        existing = await db.execute(select(User).where(User.username == "teacher"))
        if existing.scalar_one_or_none():
            print("[SKIP] Data already exists")
            return

        hashed = bcr.hashpw("123456".encode(), bcr.gensalt()).decode()
        teacher = User(username="teacher", password=hashed, role=UserRole.TEACHER)
        student1 = User(username="student", password=hashed, role=UserRole.STUDENT)
        student2 = User(username="demo", password=hashed, role=UserRole.STUDENT)
        db.add_all([teacher, student1, student2])
        await db.flush()

        # ════════════════════════════════════════════
        # 準備篇：下載與安裝 (Topic 0)
        # ════════════════════════════════════════════
        topic0 = Topic(title="準備篇：下載與安裝",
                       description="下載 Roblox 與 Roblox Studio，完成環境測試",
                       orderIndex=0)
        db.add(topic0)
        await db.flush()

        c_setup = Course(topicId=topic0.id, title="下載與安裝（影片教學腳本規劃）", orderIndex=1,
                         rbxlUrl="/0_EnvironmentTest.rbxl",
                         unlockEvent="EVENT_ENV_TEST_COMPLETED")
        db.add(c_setup)
        await db.flush()

        db.add_all([
            Chapter(courseId=c_setup.id, title="開始", orderIndex=1, type=ChapterType.READING,
                    content="歡迎來到 Block-to-Script 學習平台！\n\n本課程將引導你從零開始，學習使用 Roblox Studio 建立自己的跑酷遊戲。\n\n讓我們從基礎環境設定開始吧！"),
            Chapter(courseId=c_setup.id, title="Roblox 影片教學", orderIndex=2, type=ChapterType.READING,
                    content="前往 [roblox.com](https://www.roblox.com) 註冊帳號並下載 Roblox Player。\n\n可以先跳過此步驟，不強制下載。"),
            Chapter(courseId=c_setup.id, title="Roblox Studio 影片教學", orderIndex=3, type=ChapterType.READING,
                    content="前往 [create.roblox.com](https://create.roblox.com) 下載並安裝 Roblox Studio。\n\n⚠️ **必須安裝 Roblox Studio** 才能繼續課程。"),
            Chapter(courseId=c_setup.id, title="下載 0_EnvironmentTest.rbxl", orderIndex=4, type=ChapterType.PRACTICE,
                    content="下載環境測試檔案，在 Roblox Studio 中開啟。"),
            Chapter(courseId=c_setup.id, title="測試 0_EnvironmentTest.rbxl 流程", orderIndex=5, type=ChapterType.PRACTICE,
                    content="""### 操作步驟
1. 在 Roblox Studio 開啟下載的 .rbxl 檔案
2. 將你的 Token 貼入 Workspace.Token.Value
3. 確認 Game Settings → Allow HTTP Requests 已勾選
4. 按下 Play 開始測試
5. 使用 WASD 移動、空白鍵跳躍、滑鼠右鍵旋轉視角
6. 走到終點綠色光圈，系統會自動送出認證"""),
            Chapter(courseId=c_setup.id, title="完成", orderIndex=6, type=ChapterType.READING,
                    content="🎉 你已經成功通過環境測試，可以開始學習課程了。"),
        ])

        # ════════════════════════════════════════════
        # 主題一：Roblox Studio 新手村 (Topic 1)
        # ════════════════════════════════════════════
        topic1 = Topic(title="Roblox Studio 新手村",
                       description="熟悉 Roblox Studio 介面與基礎操作",
                       orderIndex=1)
        db.add(topic1)
        await db.flush()

        # 課程 1：為車子製作跳台
        c1_1 = Course(topicId=topic1.id, title="為車子製作跳台", orderIndex=1,
                      rbxlUrl="/1_CarJump.rbxl",
                      unlockEvent="EVENT_T1_C1_COMPLETED")
        db.add(c1_1)
        await db.flush()

        db.add_all([
            Chapter(courseId=c1_1.id, title="移動與視角", orderIndex=1, type=ChapterType.READING,
                    content="""## 移動與視角操作

- **滑鼠右鍵拖曳**：旋轉視角
- **滑鼠滾輪**：縮放
- **WASD**：在編輯模式移動

## 快捷鍵

| 功能 | 快捷鍵 |
|------|--------|
| 移動視角 | 滑鼠右鍵 + 拖曳 |
| 縮放 | 滾輪 |
| 移動工具 | W |
| 執行測試 | F5 |"""),
            Chapter(courseId=c1_1.id, title="工具箱", orderIndex=2, type=ChapterType.READING,
                    content="""## 工具箱 (Toolbox)

- 點擊上方的 **Toolbox** 標籤
- 搜尋「跳台」或「木板」
- 將零件拖入工作區

## 提示

選用簡單的幾何形狀即可，不用追求美觀。"""),
            Chapter(courseId=c1_1.id, title="編輯零件", orderIndex=3, type=ChapterType.READING,
                    content="""## 編輯工具介紹

Roblox Studio 提供四種核心編輯工具，熟練使用它們是建物的基本功。

| 工具 | 快捷鍵 | 功能 |
|------|--------|------|
| **選取** | **Q** | 點擊選取零件或模型 |
| **移動** | **W** | 拖曳箭頭沿 X/Y/Z 軸移動零件 |
| **縮放** | **E** | 拖曳方塊沿各軸放大縮小零件 |
| **旋轉** | **R** | 拖曳圓弧繞 X/Y/Z 軸旋轉零件 |

---

### 選取工具 (Q)
- 單擊選取單一零件
- 按住 **Ctrl** 加選多個零件
- 在 Explorer 中也能點擊選取

### 移動工具 (W)
- 拖曳紅/綠/藍箭頭沿單軸移動
- 拖曳箭頭間的方塊可自由移動
- 按住 **Ctrl** 拖曳可複製零件

### 縮放工具 (E)
- 拖曳白色方塊等比例縮放
- 拖曳單軸方塊沿該軸伸縮
- 適合調整跳台的長度與寬度

### 旋轉工具 (R)
- 拖曳紅/綠/藍圓弧沿單軸旋轉
- 旋轉時會顯示角度數值
- 按住 **Shift** 可 45 度增量旋轉"""),
            Chapter(courseId=c1_1.id, title="跳台製作", orderIndex=4, type=ChapterType.PRACTICE,
                    content="""### 實作目標

下載 **1_CarJump.rbxl**，在 Roblox Studio 中開啟後實際為車子製作跳台。

### 步驟
1. 點擊下方連結下載 `.rbxl` 檔案：**[下載 1_CarJump.rbxl](/1_CarJump.rbxl)**
2. 用 Roblox Studio 開啟檔案
3. 使用 **移動 (W)** 和 **縮放 (E)** 工具，從 Toolbox 找尋適合的跳台或木板
4. 放置在車子前方，讓車子能飛越峽谷
5. 將零件 **Anchor（錨定）** 開啟
6. 完成後回到平台，Roblox Studio 會自動觸發解鎖下一課"""),
        ])

        # 課程 2：介面與功能（無 Webhook，前端點擊完成）
        c1_2 = Course(topicId=topic1.id, title="介面與功能", orderIndex=2,
                      rbxlUrl=None, unlockEvent=None)
        db.add(c1_2)
        await db.flush()

        db.add_all([
            Chapter(courseId=c1_2.id, title="認識介面", orderIndex=1, type=ChapterType.READING,
                    content="""## Roblox Studio 介面

- **Explorer（總管）**：左側，顯示遊戲中所有物件
- **Properties（屬性）**：右側，顯示選取物件的詳細設定
- **Toolbox（工具箱）**：上方，搜尋並加入現成模型
- **View（檢視）**：上方選單，可切換各種視窗"""),
            Chapter(courseId=c1_2.id, title="總管介紹", orderIndex=2, type=ChapterType.READING,
                    content="""## Explorer 總管

Explorer 以樹狀結構顯示遊戲中的所有物件：

- **Workspace**：遊戲世界中的所有零件和模型
- **ServerScriptService**：伺服器端腳本
- **StarterPlayerScripts**：客戶端腳本
- **ReplicatedStorage**：雙端共享的資源"""),
            Chapter(courseId=c1_2.id, title="快捷鍵", orderIndex=3, type=ChapterType.READING,
                    content="""## 常用快捷鍵

| 功能 | 快捷鍵 |
|------|--------|
| 移動工具 | W |
| 縮放工具 | E |
| 旋轉工具 | R |
| 選取工具 | Q |
| 執行測試 | F5 |
| 複製 | Ctrl + D |
| 群組 | Ctrl + G |

閱讀完後點擊「完成學習」繼續。"""),
        ])

        # ════════════════════════════════════════════
        # 主題二：跑酷製作 (Topic 2)
        # ════════════════════════════════════════════
        topic2 = Topic(title="跑酷製作",
                       description="從零開始搭建跑酷關卡",
                       orderIndex=2)
        db.add(topic2)
        await db.flush()

        # 課程 1：專案認識（ch3 使用 Webhook）
        c2_1 = Course(topicId=topic2.id, title="專案認識", orderIndex=1,
                      rbxlUrl="/2_Parkour.rbxl",
                      unlockEvent="EVENT_T2_C1_CH3_COMPLETED")

        db.add(c2_1)
        await db.flush()

        db.add_all([
            Chapter(courseId=c2_1.id, title="專案說明", orderIndex=1, type=ChapterType.READING,
                    content="""## 專案說明

這個跑酷專案包含：
- 一條示範跑道（含旋轉機關）
- 一條你的跑道（待你鋪路）
- 出生點 (SpawnLocation)
- 終點觸發區域

你的任務是理解現有架構，後續課程將在此基礎上擴建。"""),
            Chapter(courseId=c2_1.id, title="試玩示範跑道", orderIndex=2, type=ChapterType.PRACTICE,
                    content="""### 實作目標

按下 Play 試玩示範跑道，跳到終點觸發 Webhook。

### 步驟
1. 將你的 **Token** 填入 Workspace.Token
2. 按下 **Play** 開始測試
3. 跳到 **示範跑道** 終點（FinishPart）觸發 Webhook
4. 回到平台確認章節完成"""),
            Chapter(courseId=c2_1.id, title="出生點介紹", orderIndex=3, type=ChapterType.READING,
                    content="""## 出生點 (SpawnLocation)

- SpawnLocation 決定了玩家進入遊戲時的位置
- 可以在 Properties 中調整位置和方向
- 嘗試移動 SpawnLocation 到不同位置再測試"""),
        ])

        # 課程 2：到達另一端
        c2_2 = Course(topicId=topic2.id, title="到達另一端", orderIndex=2,
                      rbxlUrl="/2_Parkour.rbxl",
                      unlockEvent="EVENT_T2_C2_COMPLETED")
        db.add(c2_2)
        await db.flush()

        db.add_all([
            Chapter(courseId=c2_2.id, title="新增物體並錨定", orderIndex=1, type=ChapterType.READING,
                    content="""## 新增物體與錨定

從 Toolbox 或使用基本零件（Part）新增方塊作為跑道。

- 選取 Part → 屬性 → **Anchor（錨定）** 打勾
- 錨定的零件不受重力影響，適合做地板和牆壁"""),
            Chapter(courseId=c2_2.id, title="空間三軸", orderIndex=2, type=ChapterType.READING,
                    content="""## 空間三軸

- **X 軸**：左右（紅色）
- **Y 軸**：上下（綠色）
- **Z 軸**：前後（藍色）

移動零件時可以按住 Ctrl 鎖定軸向，精準定位。"""),
            Chapter(courseId=c2_2.id, title="網格與模型", orderIndex=3, type=ChapterType.READING,
                    content="""## 網格與模型

- 網格幫助對齊零件（View → Grid）
- 可以調整網格大小（Model 標籤）
- 多個零件可以群組（Ctrl + G）成一個 Model"""),
            Chapter(courseId=c2_2.id, title="鋪路 跳到另一端", orderIndex=4, type=ChapterType.PRACTICE,
                    content="""### 實作目標

自行鋪設跑酷路徑，從起點到達終點。

### 步驟
1. 用 Part 新增平台和階梯
2. 利用三軸概念精準定位
3. 將你的 **Token** 填入 Workspace.Token
4. 跳到 **你的跑道** 終點（FinishPart）觸發 Webhook 解鎖下一課"""),
        ])

        # 課程 3：旋轉機關
        c2_3 = Course(topicId=topic2.id, title="旋轉機關", orderIndex=3,
                      rbxlUrl="/2_Parkour.rbxl",
                      unlockEvent="EVENT_T2_C3_COMPLETED")
        db.add(c2_3)
        await db.flush()

        db.add_all([
            Chapter(courseId=c2_3.id, title="旋轉機關原理", orderIndex=1, type=ChapterType.READING,
                    content="""## 旋轉機關原理

使用 `CFrame.Angles` 可以讓零件持續旋轉。

```lua
local plane = script.Parent

function loop ()
    plane.CFrame *= CFrame.Angles(0, 0.01, 0)
end

game:GetService('RunService').Heartbeat:Connect(loop)
```

- `CFrame.Angles(0, 0.01, 0)` 表示每秒繞 Y 軸旋轉
- 數字越大轉越快"""),
            Chapter(courseId=c2_3.id, title="積木測驗", orderIndex=2, type=ChapterType.BLOCKLY,
                    blocklyAnswer="""<xml xmlns="http://www.w3.org/1999/xhtml">
  <block type="event_heartbeat" id="1" x="0" y="0">
    <next>
      <block type="action_rotate" id="2">
        <field name="X">0</field>
        <field name="Y">0.01</field>
        <field name="Z">0</field>
      </block>
    </next>
  </block>
</xml>"""),
            Chapter(courseId=c2_3.id, title="程式碼說明與複製", orderIndex=3, type=ChapterType.CLOZE,
                    luaCode="""local plane = script.Parent

function loop ()
    plane.CFrame *= CFrame.Angles(0, ______, 0)
end

game:GetService('RunService').Heartbeat:Connect(______)""",
                    luaAnswers=json.dumps(["0.01", "loop"])),
            Chapter(courseId=c2_3.id, title="加上腳本並調整", orderIndex=4, type=ChapterType.READING,
                    content="""### 操作說明

將取得的 Lua 腳本貼入障礙物中。

### 步驟
1. 在障礙物下新增 Script
2. 貼上從平台取得的程式碼
3. 調整旋轉速度（修改數字）
4. 測試旋轉效果"""),
            Chapter(courseId=c2_3.id, title="達成要求", orderIndex=5, type=ChapterType.PRACTICE,
                    content="""### 最終挑戰

至少要碰到一個會旋轉的物體，並跳到 **你的跑道** 終點。

### 驗證
- 成功通過旋轉機關
- 抵達 **你的跑道/FinishPart** 觸發 Webhook
- 回到平台確認課程完成"""),
        ])

        # ── 學習紀錄 ──
        all_courses = [c_setup, c1_1, c1_2, c2_1, c2_2, c2_3]
        for student in [student1, student2]:
            for i, c in enumerate(all_courses):
                db.add(LearningRecord(
                    userId=student.id, courseId=c.id,
                    status=LearningStatus.UNLOCKED if i == 0 else LearningStatus.LOCKED
                ))

        await db.commit()
        print("[OK] Seed done")
        print(f"  teacher / 123456  (role=teacher)")
        print(f"  student / 123456  (role=student)")
        print(f"  demo    / 123456  (role=student)")
        print(f"  主題數：3")
        print(f"  課程數：{len(all_courses)}")

        total_ch = 0
        for course in all_courses:
            ch_list = await db.execute(
                select(Chapter).where(Chapter.courseId == course.id)
            )
            chapters = ch_list.scalars().all()
            total_ch += len(chapters)

        print(f"  章節總數：{total_ch}")


if __name__ == "__main__":
    asyncio.run(seed())
