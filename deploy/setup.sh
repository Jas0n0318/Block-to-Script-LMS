#!/bin/bash
# Block-to-Script LMS — Hetzner VPS 一鍵部署腳本
# 在 Hetzner Ubuntu 24.04 新機器上執行：bash setup.sh

set -euo pipefail

echo "=== 1. 安裝系統套件 ==="
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv nodejs npm ufw curl

echo "=== 2. 建立專案目錄 ==="
mkdir -p /opt/lms
cd /opt/lms

echo "=== 3. 複製專案程式碼 ==="
# 從 GitHub 拉取（請先 fork 或 push 到你的 private repo）
# 或手動上傳：將整個專案資料夾 scp 到 /opt/lms/
# 以下二選一：

# 方式 A：從 Git 拉取（推薦）
# git clone https://github.com/你的帳號/你的專案.git .
# git checkout optimize-for-50-users

# 方式 B：手動上傳後，直接繼續
# scp -r C:\Users\user\... user@你的HetznerIP:/opt/lms/

echo "請確認 /opt/lms 內已有 backend/ 和 frontend/ 資料夾"
read -p "按 Enter 繼續..."

echo "=== 4. 設定後端環境 ==="
cd /opt/lms/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -q

# 產生 .env（請自行填入 OPENAI_API_KEY）
if [ ! -f .env ]; then
    cat > .env << 'ENVEOF'
DATABASE_URL="sqlite:///./dev.db"
JWT_SECRET="change-this-to-a-random-secret-in-production"
OPENAI_API_KEY="你的 OpenAI API Key"
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
AI_CHECKER_INTERVAL=5
ENVEOF
    echo "請編輯 /opt/lms/backend/.env 填入 OPENAI_API_KEY"
    echo "然後重新執行此腳本"
    exit 0
fi

echo "=== 5. 建置前端 ==="
cd /opt/lms/frontend
npm install -s
npm run build

echo "=== 6. 設定 systemd 服務 ==="
cat > /etc/systemd/system/lms-backend.service << 'SERVICEEOF'
[Unit]
Description=Block-to-Script LMS Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/lms/backend
ExecStart=/opt/lms/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable lms-backend
systemctl start lms-backend

echo "=== 7. 設定防火牆 ==="
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 8001/tcp
ufw --force enable

echo ""
echo "=== 部署完成！==="
echo "後端 API: http://$(curl -s ifconfig.me):8001"
echo "前端頁面: http://$(curl -s ifconfig.me):8001"
echo ""
echo "常用指令："
echo "  查看服務狀態: systemctl status lms-backend"
echo "  查看即時日誌: journalctl -u lms-backend -f"
echo "  重啟服務:     systemctl restart lms-backend"
echo ""
echo "請確認 .env 內的 OPENAI_API_KEY 已正確設定"
