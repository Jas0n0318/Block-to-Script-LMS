import { useState } from "react";

interface Props {
  code: string;
  blankHint?: string;
  answers?: string[];
  onFillComplete?: () => void;
}

export default function LuaCodeBlock({ code, blankHint, answers, onFillComplete }: Props) {
  const [filled, setFilled] = useState<Record<number, string>>({});
  const [showHint, setShowHint] = useState(false);
  const [checked, setChecked] = useState(false);

  const parts = code.split(/(______)/g);
  const blankCount = parts.filter((p) => p === "______").length;
  let blankIndex = 0;

  const allFilled = Array.from({ length: blankCount }).every((_, i) => filled[i]?.trim());
  const allCorrect = answers
    ? Array.from({ length: blankCount }).every((_, i) =>
        filled[i]?.trim().toLowerCase() === answers[i]?.toLowerCase()
      )
    : allFilled;

  const handleCheck = () => {
    setChecked(true);
    if (allCorrect) {
      onFillComplete?.();
    }
  };

  const inputClass = (correct: boolean) => {
    if (!checked) return "bg-yellow-100 text-black";
    return correct
      ? "bg-green-200 text-green-900"
      : "bg-red-200 text-red-900";
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-green-400 font-bold">Lua</span>
        <span className="text-gray-500 text-xs">— 將下方程式碼貼到 Roblox Studio</span>
      </div>
      <pre className="text-green-300 whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) => {
          if (part !== "______") {
            return <span key={i}>{part}</span>;
          }
          const idx = blankIndex++;
          const val = filled[idx] || "";
          const correct = checked && answers?.[idx]?.toLowerCase() === val.trim().toLowerCase();
          const wrong = checked && !correct && val.trim() !== "";
          return (
            <input
              key={i}
              type="text"
              value={val}
              onChange={(e) => {
                setFilled({ ...filled, [idx]: e.target.value });
                setChecked(false);
              }}
              className={`${inputClass(correct)} w-20 text-center rounded mx-0.5 px-1 ${
                wrong ? "ring-2 ring-red-500" : ""
              }`}
              placeholder="?"
            />
          );
        })}
      </pre>
      {blankHint && (
        <div className="mt-2">
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-yellow-400 text-xs underline"
          >
            {showHint ? "隱藏提示" : "顯示提示"}
          </button>
          {showHint && (
            <p className="text-yellow-300 text-xs mt-1">{blankHint}</p>
          )}
        </div>
      )}
      <div className="mt-3">
        <button
          onClick={handleCheck}
          disabled={!allFilled}
          className={`px-4 py-1.5 rounded text-sm font-medium ${
            !allFilled
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : allCorrect && checked
              ? "bg-green-600 text-white"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {!allFilled
            ? "請填寫所有空格"
            : checked && allCorrect
            ? "✓ 全部正確！"
            : "檢查答案"}
        </button>
      </div>
    </div>
  );
}
