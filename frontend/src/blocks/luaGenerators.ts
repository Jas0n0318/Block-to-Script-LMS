import * as Blockly from "blockly";

const Lua = new Blockly.Generator("Lua") as any;

Lua.scrub_ = function (block: Blockly.Block, code: string, thisOnly?: boolean) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  if (nextBlock && !thisOnly) {
    return code + "\n" + Lua.blockToCode(nextBlock);
  }
  return code;
};

Lua["event_touch"] = function (block: Blockly.Block) {
  const part = block.getFieldValue("PART") || "Part";
  return `script.Parent.Touched:Connect(function(hit)\n  if hit.Parent:FindFirstChild("${part}") then\nend)`;
};

Lua["action_decrease_hp"] = function (block: Blockly.Block) {
  const amount = block.getFieldValue("AMOUNT") || 10;
  return `  local humanoid = hit.Parent:FindFirstChild("Humanoid")\n  if humanoid then\n    humanoid.Health = humanoid.Health - ${amount}\n  end`;
};

Lua["action_play_sound"] = function (block: Blockly.Block) {
  const sound = block.getFieldValue("SOUND") || "crash";
  return `  game:GetService("ReplicatedStorage"):FindFirstChild("${sound}"):Play()`;
};

Lua["action_teleport"] = function (block: Blockly.Block) {
  const x = block.getFieldValue("X") || 0;
  const y = block.getFieldValue("Y") || 10;
  const z = block.getFieldValue("Z") || 0;
  return `  hit.Parent:FindFirstChild("HumanoidRootPart").CFrame = CFrame.new(${x}, ${y}, ${z})`;
};

Lua["control_wait"] = function (block: Blockly.Block) {
  const seconds = block.getFieldValue("SECONDS") || 1;
  const inner = Lua.statementToCode(block, "DO");
  return `  task.wait(${seconds})\n${inner}`;
};

Lua["event_heartbeat"] = function (block: Blockly.Block) {
  const inner = Lua.statementToCode(block, "DO");
  return `game:GetService('RunService').Heartbeat:Connect(function()\n${inner}\nend)`;
};

Lua["event_game_start"] = function (block: Blockly.Block) {
  const inner = Lua.statementToCode(block, "DO");
  return `game.Players.PlayerAdded:Connect(function(player)\n${inner}\nend)`;
};

Lua["action_rotate"] = function (block: Blockly.Block) {
  const x = block.getFieldValue("X") || 0;
  const y = block.getFieldValue("Y") || 0.01;
  const z = block.getFieldValue("Z") || 0;
  return `  script.Parent.CFrame *= CFrame.Angles(${x}, ${y}, ${z})`;
};

Lua["control_repeat"] = function (block: Blockly.Block) {
  const times = block.getFieldValue("TIMES") || 10;
  const inner = Lua.statementToCode(block, "DO");
  return `  for i = 1, ${times} do\n${inner}\n  end`;
};

Lua["logic_if"] = function (block: Blockly.Block) {
  const condition = block.getFieldValue("CONDITION") || "true";
  const inner = Lua.statementToCode(block, "DO");
  return `  if ${condition} then\n${inner}\n  end`;
};

export { Lua };
