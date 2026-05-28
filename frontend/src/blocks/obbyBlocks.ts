import * as Blockly from "blockly";

export const obbyBlocks = [
  {
    type: "event_touch",
    message0: "當角色碰到 %1",
    args0: [{ type: "field_input", name: "PART", text: "KillPart" }],
    previousStatement: null,
    nextStatement: null,
    colour: 230,
  },
  {
    type: "action_decrease_hp",
    message0: "減少生命值 %1 點",
    args0: [{ type: "field_number", name: "AMOUNT", value: 10, min: 1 }],
    previousStatement: null,
    nextStatement: null,
    colour: 30,
  },
  {
    type: "action_play_sound",
    message0: "播放音效 %1",
    args0: [
      {
        type: "field_dropdown",
        name: "SOUND",
        options: [
          ["碰撞音", "crash"],
          ["過關音", "win"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 150,
  },
  {
    type: "action_teleport",
    message0: "傳送到位置 X:%1 Y:%2 Z:%3",
    args0: [
      { type: "field_number", name: "X", value: 0 },
      { type: "field_number", name: "Y", value: 10 },
      { type: "field_number", name: "Z", value: 0 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
  },
  {
    type: "control_wait",
    message0: "等待 %1 秒",
    args0: [{ type: "field_number", name: "SECONDS", value: 1, min: 0.1 }],
    previousStatement: null,
    nextStatement: null,
    colour: 60,
  },
  {
    type: "event_heartbeat",
    message0: "當 Heartbeat 觸發時",
    args0: [],
    previousStatement: null,
    nextStatement: null,
    colour: 230,
  },
  {
    type: "event_game_start",
    message0: "當遊戲啟動時",
    args0: [],
    previousStatement: null,
    nextStatement: null,
    colour: 230,
  },
  {
    type: "action_rotate",
    message0: "旋轉 X:%1 Y:%2 Z:%3",
    args0: [
      { type: "field_number", name: "X", value: 0 },
      { type: "field_number", name: "Y", value: 0.01, precision: 0.001 },
      { type: "field_number", name: "Z", value: 0 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 30,
  },
  {
    type: "control_repeat",
    message0: "重複執行 %1 次",
    args0: [{ type: "field_number", name: "TIMES", value: 10, min: 1 }],
    message1: "執行 %1",
    args1: [{ type: "input_statement", name: "DO" }],
    previousStatement: null,
    nextStatement: null,
    colour: 60,
  },
  {
    type: "logic_if",
    message0: "如果 %1",
    args0: [{ type: "field_input", name: "CONDITION", text: "true" }],
    message1: "那麼 %1",
    args1: [{ type: "input_statement", name: "DO" }],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
  },
];

export function registerBlocks() {
  Blockly.defineBlocksWithJsonArray(obbyBlocks);
}
