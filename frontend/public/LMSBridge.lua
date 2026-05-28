--[[
  LMSBridge.lua (v3 — Configurable URL + Event)
  ==============================================
  Put this script in ServerScriptService in your .rbxl file.

  How it works:
  - Reads EVENT and WEBHOOK_URL from Workspace values (if present)
  - Falls back to defaults below if no Workspace values are set

  REQUIREMENTS:
  1. Workspace.Token (StringValue) — contains student_token
  2. Workspace.ApiUrl (StringValue, optional) — override webhook URL
  3. Workspace.EventName (StringValue, optional) — override event name
  4. Game Settings → Allow HTTP Requests must be checked
]]

local HttpService = game:GetService("HttpService")

-- Default settings (used if no Workspace value is set)
local DEFAULT_EVENT = "EVENT_ENV_TEST_COMPLETED"
local DEFAULT_URL = "http://130.211.202.50:8001/api/webhook/unlock"

-- Read from Workspace overrides (if present)
local function getWorkspaceValue(name, default)
	local v = workspace:FindFirstChild(name)
	if v and v:IsA("StringValue") and v.Value ~= "" then
		return v.Value
	end
	return default
end

local EVENT = getWorkspaceValue("EventName", DEFAULT_EVENT)
local WEBHOOK_URL = getWorkspaceValue("ApiUrl", DEFAULT_URL)

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
