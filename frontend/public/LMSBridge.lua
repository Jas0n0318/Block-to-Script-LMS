--[[
  LMSBridge.lua (v2 — Event-based)
  ================================
  Put this script in ServerScriptService in your .rbxl file.

  REQUIREMENTS:
  1. Workspace.Token.Value must exist (StringValue) — contains student_token
  2. Game Settings → Allow HTTP Requests must be checked
  3. Backend running on http://127.0.0.1:8001

  CHANGE the EVENT constant below to match the course's unlock event.
]]

local HttpService = game:GetService("HttpService")
local Token = workspace:FindFirstChild("Token")

-- ******** 修改這裡：對應課程的 unlock event ********
local EVENT = "EVENT_ENV_TEST_COMPLETED"
-- ***************************************************

local WEBHOOK_URL = "http://127.0.0.1:8001/api/webhook/unlock"

-- Verify Token exists
if not Token or Token:IsA("StringValue") == false then
	warn("[LMSBridge] Missing Workspace.Token.Value")
	return
end

-- Debounce
local sent = false

local function sendWebhook()
	if sent then return end
	sent = true

	local payload = {
		token = Token.Value,
		event = EVENT,
	}

	local success, result = pcall(function()
		local json = HttpService:JSONEncode(payload)
		local response = HttpService:PostAsync(WEBHOOK_URL, json, Enum.HttpContentType.ApplicationJson)
		print("[LMSBridge] Webhook sent successfully:", response)
	end)

	if not success then
		warn("[LMSBridge] Webhook failed:", result)
		sent = false
	end
end

-- Connect to trigger part (create a Part named FinishPart in Workspace)
local Trigger = workspace:FindFirstChild("FinishPart")
if Trigger and Trigger:IsA("BasePart") then
	Trigger.Touched:Connect(function(hit)
		local player = game.Players:GetPlayerFromCharacter(hit.Parent)
		if player then
			sendWebhook()
		end
	end)
end
