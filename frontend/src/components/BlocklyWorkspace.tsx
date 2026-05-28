import { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import { registerBlocks } from "../blocks/obbyBlocks";
import "../blocks/luaGenerators";

registerBlocks();

interface Props {
  onWorkspaceReady?: (workspace: Blockly.WorkspaceSvg) => void;
  readOnly?: boolean;
  initialXml?: string;
}

export default function BlocklyWorkspace({ onWorkspaceReady, readOnly = false, initialXml }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  useEffect(() => {
    if (!containerRef.current || workspaceRef.current) return;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: {
        kind: "categoryToolbox",
        contents: [
          {
            kind: "category",
            name: "事件",
            colour: "230",
            contents: [
              { kind: "block", type: "event_touch" },
              { kind: "block", type: "event_heartbeat" },
              { kind: "block", type: "event_game_start" },
            ],
          },
          {
            kind: "category",
            name: "動作",
            colour: "30",
            contents: [
              { kind: "block", type: "action_decrease_hp" },
              { kind: "block", type: "action_play_sound" },
              { kind: "block", type: "action_teleport" },
              { kind: "block", type: "action_rotate" },
            ],
          },
          {
            kind: "category",
            name: "控制",
            colour: "60",
            contents: [
              { kind: "block", type: "control_wait" },
              { kind: "block", type: "control_repeat" },
            ],
          },
          {
            kind: "category",
            name: "邏輯",
            colour: "210",
            contents: [
              { kind: "block", type: "logic_if" },
            ],
          },
        ],
      },
      readOnly,
      move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 20, length: 3, colour: "#ccc" },
    });

    if (initialXml) {
      const parser = new DOMParser();
      const dom = parser.parseFromString(initialXml, "text/xml");
      Blockly.Xml.domToWorkspace(dom.documentElement, workspace);
    }

    workspaceRef.current = workspace;
    onWorkspaceReady?.(workspace);

    return () => {
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "400px", border: "1px solid #ccc", borderRadius: "8px" }}
    />
  );
}
