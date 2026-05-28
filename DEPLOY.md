# Hetzner VPS 部署指南

## 你需要先做

| 步驟 | 花費 |
|------|------|
| 1. 註冊 Hetzner → https://www.hetzner.com/cloud | 5 分鐘 |
| 2. 建立一個 **CX22** VM（Ubuntu 24.04） | 2 分鐘 |
| 3. 複製 VM 的 IP 位置（Hetzner 控制台會顯示） | — |
| 4. 將專案上傳到 VM（方法見下方） | 10 分鐘 |
| 5. SSH 進 VM，跑 `bash deploy/setup.sh` | 5 分鐘 |
| 6. 設定 `.env` 的 `OPENAI_API_KEY` | 1 分鐘 |

### Hetzner CX22 規格（150 元/月）

| 項目 | 規格 |
|------|------|
| vCPU | 2 Core |
| RAM | 4 GB |
| 硬碟 | 40 GB SSD |
| 流量 | 20 TB/月 |
| 價格 | €3.99/月 ≈ 150 台幣/月 |

---

## 詳細步驟

### Step 1：註冊 Hetzner

1. 到 https://www.hetzner.com/cloud 註冊
2. 驗證 Email + 手機
3. 選擇付款方式（信用卡或 Paypal）

### Step 2：開 VM

1. 登入 Hetzner Cloud Console
2. 按 **"Add Server"**
3. 選擇：
   - **Location**: 選 Germany（最便宜）或 Finland
   - **Image**: Ubuntu 24.04
   - **Type**: CX22（€3.99/月）
   - **Firewall**: 先略過（腳本會設定）
   - **SSH Keys**: 如果不會用 SSH key，可以選 **"Use root password"**（Hetzner 會寄密碼到 Email）
4. 按 **"Create & Buy"**
5. 複製顯示的 **IPv4** 位置

### Step 3：上傳專案到 VM

在**你的電腦**上執行：

```powershell
# 先安裝 Git for Windows + OpenSSH Client（如已安裝則略過）

# 在 powershell 中上傳（替換 IP 為你的 VM IP）
scp -r C:\Users\user\桌面\南大\大三下\學習管理系統\Roblox Studio智慧學習平台 root@你的VM_IP:/opt/lms/
```

系統會問密碼 → 輸入 Hetzner 給你的 root 密碼。

### Step 4：SSH 進 VM 並執行安裝

```powershell
ssh root@你的VM_IP
```

```bash
# 現在你已經在 VM 裡面了
cd /opt/lms
bash deploy/setup.sh
```

### Step 5：設定 OpenAI API Key

腳本會自動產生 `.env` 並暫停，請編輯：

```bash
nano /opt/lms/backend/.env
```

把 `OPENAI_API_KEY` 改成你的金鑰，然後再次執行：

```bash
bash deploy/setup.sh
```

### Step 6：完成

部署成功後會顯示：

```
後端 API: http://你的VM_IP:8001
前端頁面: http://你的VM_IP:8001
```

---

## 給同學的存取資訊

| 項目 | 網址 |
|------|------|
| 前端頁面 | `http://你的VM_IP:8001` |
| 帳號註冊 | `http://你的VM_IP:8001/register` |
| 教師後台 | `http://你的VM_IP:8001/admin/students` |
| API 文件 | `http://你的VM_IP:8001/docs` |

測試帳號：`teacher / 123456`、`student / 123456`、`demo / 123456`

### Roblox Studio Webhook

同學進入遊戲後，在 `TutorialGuide.lua` 中將 URL 改為：

```lua
local WEBHOOK_URL = "http://你的VM_IP:8001/api/webhook/unlock"
```

---

## 常用管理指令（SSH 進 VM 後執行）

```bash
# 查看服務狀態
systemctl status lms-backend

# 查看即時日誌（Ctrl+C 退出）
journalctl -u lms-backend -f

# 重啟服務
systemctl restart lms-backend

# 更新程式碼（重新上傳後）
systemctl restart lms-backend
```

---

## 省錢小技巧：用完就關

Hetzner 以小時計費，CX22 = 0.006 €/小時 ≈ 0.2 元/小時。
- 全班上線時 → 開機
- 下課後 → 關機（Hetzner Console 按 Off）
- 這樣一學期可能不到 100 元
