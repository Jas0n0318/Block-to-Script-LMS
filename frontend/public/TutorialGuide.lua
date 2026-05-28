--[[
  TutorialGuide.lua (v3 — Fixed timeout + debounce)
  放入 ServerScriptService
]]--

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local EVENT = "EVENT_ENV_TEST_COMPLETED"
local WEBHOOK_URL = "http://127.0.0.1:8001/api/webhook/unlock"

-- 設定 timeout（秒）
HttpService.Timeout = 5

-- 防重複發送
local sent = false

-- 檢查 Token
local tokenValue = workspace:FindFirstChild("Token")
if not tokenValue then
	warn("[TutorialGuide] ❌ Workspace 下找不到 Token")
elseif not tokenValue:IsA("StringValue") then
	warn("[TutorialGuide] ❌ Token 不是 StringValue，而是 " .. tokenValue.ClassName)
else
	print("[TutorialGuide] ✅ Token 找到，值 = '" .. tokenValue.Value .. "'")
end

-- 檢查 FinishPart
local finishPart = workspace:FindFirstChild("FinishPart")
if finishPart then
	print("[TutorialGuide] ✅ FinishPart 找到，連接 Touched 事件...")
	finishPart.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		if not player then return end
		if sent then return end

		print("[TutorialGuide] 玩家碰觸 FinishPart: " .. player.Name)

		-- 讀取 Token
		local tv = workspace:FindFirstChild("Token")
		if not tv or not tv:IsA("StringValue") or tv.Value == "" then
			warn("[TutorialGuide] ❌ Token 無效，無法發送")
			return
		end

		-- 準備請求
		local payload = HttpService:JSONEncode({
			token = tv.Value,
			event = EVENT
		})
		print("[TutorialGuide] 發送 POST 到 " .. WEBHOOK_URL)
		print("[TutorialGuide] Payload: " .. payload)

		-- 發送（使用 HttpService.Timeout = 5）
		sent = true
		local ok, err = pcall(function()
			local resp = HttpService:PostAsync(WEBHOOK_URL, payload, Enum.HttpContentType.ApplicationJson, false, false)
			print("[TutorialGuide] ✅ 伺服器回應: " .. resp)
		end)

		if ok then
			print("[TutorialGuide] ✅ Webhook 成功！")
		else
			warn("[TutorialGuide] ❌ Webhook 失敗: " .. tostring(err))
			sent = false
		end
	end)
else
	warn("[TutorialGuide] ❌ Workspace 下找不到 FinishPart")
end

print("[TutorialGuide] v3 已啟動（timeout=5, debounce=enabled）")
