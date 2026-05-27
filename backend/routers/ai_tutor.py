import asyncio
import json
import xml.etree.ElementTree as ET
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from jose import jwt, JWTError
from database import async_session
from models import Course, Chapter, BehaviorLog
from config import JWT_SECRET, JWT_ALGORITHM, OPENAI_API_KEY
from openai import AsyncOpenAI
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/ai-tutor", tags=["ai_tutor"])

client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

BLOCKLY_KEYWORDS = ["event_heartbeat", "action_rotate", "action_decrease_hp", "action_play_sound", "action_teleport", "event_touch", "event_game_start", "controls_wait", "controls_repeat", "logic_if"]


@router.websocket("/chat")
async def ai_tutor_chat(websocket: WebSocket):
    await websocket.accept()

    stop_signal = asyncio.Event()
    session_events: list[dict] = []
    conversation_history: list[dict] = []
    last_student_msg_time = datetime.now(timezone.utc)
    last_intervention_time = datetime.now(timezone.utc) - timedelta(hours=1)
    last_intervention_reason = ""
    last_block_error_count = 0
    intervention_cooldown = timedelta(seconds=120)
    stream_lock = asyncio.Lock()
    user_id = None
    course_id = None
    course_title = "未知課程"

    async def _fetch_context():
        """Query ALL behavior logs for this user (cross-course historical data)."""
        async with async_session() as db:
            result = await db.execute(
                select(BehaviorLog).where(
                    BehaviorLog.userId == user_id,
                ).order_by(BehaviorLog.createdAt.desc()).limit(500)
            )
            return list(result.scalars().all())

    async def _build_system_prompt(extra_context: str = "") -> str:
        db_logs = await _fetch_context()
        block_errors = [log for log in db_logs if log.actionType == "block_error"]
        roblox_hits = [log for log in db_logs if log.actionType == "webhook_unlock"]
        ai_queries = [log for log in db_logs if log.actionType == "ai_query"]
        readings = [log for log in db_logs if log.actionType == "reading_done"]
        cloze_done = [log for log in db_logs if log.actionType == "cloze_done"]
        practice_done = [log for log in db_logs if log.actionType == "practice_done"]
        total_duration = sum((log.duration or 0) for log in db_logs)
        recent_events = session_events[-5:] if session_events else []
        events_summary = "\n".join(
            f"- {e.get('action', 'unknown')}: {e.get('detail', '')}" for e in recent_events
        )

        # Cross-course grouping
        course_dwell: dict[int, int] = {}
        course_names: dict[int, str] = {}
        course_errors: dict[int, int] = {}
        for log in db_logs:
            cid = log.courseId
            if not cid:
                continue
            if log.actionType == "page_dwell" and log.duration:
                course_dwell[cid] = course_dwell.get(cid, 0) + log.duration
                if log.detail:
                    try:
                        det = json.loads(log.detail)
                        course_names.setdefault(cid, det.get("title", f"課程{cid}"))
                    except (json.JSONDecodeError, TypeError):
                        course_names.setdefault(cid, f"課程{cid}")
            if log.actionType == "block_error":
                course_errors[cid] = course_errors.get(cid, 0) + 1

        # Page dwell analysis
        page_dwells = [log for log in db_logs if log.actionType == "page_dwell"]
        dwell_by_type: dict[str, int] = {}
        long_dwells: list[str] = []
        for d in page_dwells:
            if d.detail and d.duration:
                try:
                    det = json.loads(d.detail)
                    t = det.get("type", "unknown")
                    dwell_by_type[t] = dwell_by_type.get(t, 0) + d.duration
                    if d.duration > 300:
                        long_dwells.append(det.get("title", "某章節"))
                except (json.JSONDecodeError, TypeError):
                    pass

        ctx = []
        if total_duration:
            ctx.append(f"停留約 {total_duration} 秒")
        if block_errors:
            ctx.append(f"積木拼錯 {len(block_errors)} 次")
        if roblox_hits:
            ctx.append(f"Roblox 測試過關 {len(roblox_hits)} 次")
        if ai_queries:
            ctx.append(f"問了 {len(ai_queries)} 次問題")
        if readings:
            ctx.append(f"讀完 {len(readings)} 篇閱讀")
        if cloze_done:
            ctx.append(f"完成 {len(cloze_done)} 題填空")
        if practice_done:
            ctx.append(f"通過 {len(practice_done)} 個實作")
        # Per-type dwell time
        if dwell_by_type:
            type_labels = {"READING": "閱讀", "BLOCKLY": "積木測驗", "CLOZE": "程式填空", "PRACTICE": "實作"}
            parts = []
            for raw_type, secs in sorted(dwell_by_type.items(), key=lambda x: -x[1]):
                label = type_labels.get(raw_type, raw_type)
                mins = round(secs / 60)
                if mins > 0:
                    parts.append(f"{label}花了{mins}分鐘")
            if parts:
                ctx.append("、".join(parts))
        # Cross-course summary
        course_lines = []
        for cid, dwell_secs in sorted(course_dwell.items(), key=lambda x: -x[1]):
            mins = round(dwell_secs / 60)
            errs = course_errors.get(cid, 0)
            parts = []
            if mins:
                parts.append(f"停留{mins}分鐘")
            if errs:
                parts.append(f"錯誤{errs}次")
            if parts:
                course_lines.append(f"課程「{course_names.get(cid, cid)}」: {'、'.join(parts)}")
        if course_lines:
            ctx.append("跨課程統計：" + "；".join(course_lines))
        # Anomaly: chapters with > 10 min dwell
        if long_dwells and not extra_context:
            extra_context = f"提醒：學生在「{'、'.join(long_dwells[:2])}」停留超過 5 分鐘，可能卡關，請主動詢問。"

        context_summary = "、".join(ctx) if ctx else "剛開始"
        last_err = (block_errors[-1].detail or "") if block_errors else ""
        blockly_hint = ""
        if not course_id:
            print(f"[AI_TUTOR] course_id is None, skipping blockly hint")
        if course_id:
            try:
                async with async_session() as db:
                    ch_result = await db.execute(
                        select(Chapter).where(Chapter.courseId == course_id, Chapter.type == "BLOCKLY")
                    )
                    blockly_chapters = list(ch_result.scalars().all())
                for bc in blockly_chapters:
                    if bc.blocklyAnswer:
                        try:
                            root = ET.fromstring(bc.blocklyAnswer)
                            namespaces = {"xhtml": "http://www.w3.org/1999/xhtml"}
                            blocks = root.findall(".//xhtml:block", namespaces) or root.findall(".//block")
                            names = [b.get("type", "unknown") for b in blocks]
                            total = len(blocks)
                            block_names = " → ".join(names)
                            blockly_hint += f"\n【積木測驗資訊 - 內部參考】章節「{bc.title}」共有 {total} 個積木（種類順序僅供你自己確認，不可直接告知學生）"
                            print(f"[AI_TUTOR] blockly_hint generated: {total} blocks, {block_names}")
                        except (ET.ParseError, Exception) as xml_err:
                            print(f"[AI_TUTOR] XML parse error for {bc.title}: {xml_err}")
                            blockly_hint += f"\n【積木測驗正確解答】章節「{bc.title}」的正確答案：{bc.blocklyAnswer}"
            except Exception as db_err:
                print(f"[AI_TUTOR] blockly DB query error: {db_err}")

        return f"""你是工地主任，帶實習生（學生）蓋跑酷遊樂園。課程：{course_title}。學生狀況：{context_summary}。
{('最近錯誤：' + last_err) if last_err else ''}
{blockly_hint}
{events_summary if events_summary else ''}
{extra_context}

【嚴格回覆規範：極度重要】
1. 角色比例限制：你只能在開場稱呼（如：小工頭）或簡短鼓勵時使用工地風格。
2. 絕對禁用比喻：在講解錯誤或提示下一步時，【嚴禁】把程式概念比喻成工地物件。絕對不要說「打地基」、「鎖螺絲」、「接鋼筋」。
3. 使用精準專有名詞：請直接使用精確的介面與邏輯用語，例如：「工具箱 (Toolbox)」、「屬性面板 (Properties)」、「迴圈積木」、「CFrame 旋轉」。
4. 結構化輸出：
   - 第 1 句話：點出學生的具體狀況（例如：我看到你剛剛拼錯了迴圈積木）。
   - 第 2-3 句話：給出清晰、白話的操作指令，引導他解決問題。
5. 【嚴禁自行修改數據】提示中給你的停留時間（如「5 分鐘」）是正確的，請直接沿用，不要自行改為 10 分鐘或其他數字。
6. 【關於積木測驗資訊的使用限制】如果學生問「總共幾個積木」，你必須直接回答數字（例如「2 個」），不要反問或引導。但如果學生問的是「要用什麼積木」或「順序是什麼」，【嚴禁】說出具體積木名稱或排列順序，只能用引導方式回應。"""

    async def _chat(question: str):
        """Handle user chat message — stream AI response."""
        async with stream_lock:
            system = await _build_system_prompt()
            conversation_history.append({"role": "user", "content": question})
            try:
                # Filter out old assistant messages that leaked block names
                filtered_history = []
                for msg in conversation_history[-20:]:
                    if msg["role"] == "assistant" and any(kw in (msg.get("content") or "") for kw in BLOCKLY_KEYWORDS):
                        continue  # skip old messages that leaked block names
                    filtered_history.append(msg)

                stream = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system},
                        *filtered_history,
                    ],
                    stream=True,
                )
                reply = ""
                async for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        reply += content
                        await websocket.send_json({"type": "chunk", "content": content})
                conversation_history.append({"role": "assistant", "content": reply})
                await websocket.send_json({"type": "done"})
            except Exception as e:
                await websocket.send_json({"type": "error", "content": str(e)})
                await websocket.send_json({"type": "done"})

    async def _celebrate(action: str, detail: str):
        """Immediate celebration for urgent events (no wait for 60s cycle)."""
        async with stream_lock:
            nonlocal last_intervention_time
            last_intervention_time = datetime.now(timezone.utc)
            system = f"實習生剛剛達成了 {action}（{detail}）。請用工地主任的口吻，用 1-2 句話立刻給予熱烈祝賀，並提示他可以前往下一關。"
            try:
                filtered = [m for m in conversation_history[-10:] if not (m["role"] == "assistant" and any(kw in (m.get("content") or "") for kw in BLOCKLY_KEYWORDS))]
                stream = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": system}, *filtered],
                    stream=True,
                )
                first = True
                reply = ""
                async for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        reply += content
                        msg_type = "intervention" if first else "chunk"
                        first = False
                        await websocket.send_json({"type": msg_type, "content": content})
                conversation_history.append({"role": "assistant", "content": reply})
                await websocket.send_json({"type": "done"})
            except Exception:
                pass

    async def _intervene(reason: str, block_detail: str = ""):
        """Send a proactive intervention to the student."""
        async with stream_lock:
            nonlocal last_intervention_time
            last_intervention_time = datetime.now(timezone.utc)
            extra = f"重要提醒：{reason}。"
            if block_detail:
                extra += f"學生最近一次的積木錯誤細節是：{block_detail}。請根據這個細節，給出一個具體的操作提示（例如該去拉什麼顏色的積木），而不要只給空泛的鼓勵。"
            extra += "請用一句簡短的鼓勵開場，接著直接根據上述錯誤細節，給予精確的介面操作或積木修正指示。不要廢話，不要過度比喻。"
            system = await _build_system_prompt(extra_context=extra)
            try:
                filtered = [m for m in conversation_history[-10:] if not (m["role"] == "assistant" and any(kw in (m.get("content") or "") for kw in BLOCKLY_KEYWORDS))]
                stream = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": system}, *filtered],
                    stream=True,
                )
                first = True
                reply = ""
                async for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        reply += content
                        msg_type = "intervention" if first else "chunk"
                        first = False
                        await websocket.send_json({"type": msg_type, "content": content})
                conversation_history.append({"role": "assistant", "content": reply})
                await websocket.send_json({"type": "done"})
            except Exception:
                pass

    async def intervention_checker():
        """Background loop: checks idle time & behavior logs every 5s."""
        while not stop_signal.is_set():
            try:
                await asyncio.wait_for(stop_signal.wait(), timeout=5)
                break
            except asyncio.TimeoutError:
                pass

            now = datetime.now(timezone.utc)
            student_idle = (now - last_student_msg_time).total_seconds()
            if student_idle < 60:
                continue
            if (now - last_intervention_time).total_seconds() < intervention_cooldown.total_seconds():
                continue

            try:
                nonlocal last_intervention_reason, last_block_error_count
                db_logs = await _fetch_context()
                block_errors = [log for log in db_logs if log.actionType == "block_error"]
                total_duration = sum((log.duration or 0) for log in db_logs)

                reason = None
                block_detail = ""
                # Only consider page_dwells from the last 30 minutes
                recent_cutoff = datetime.now() - timedelta(minutes=30)
                recent_dwells = [
                    log for log in db_logs
                    if log.actionType == "page_dwell"
                    and log.duration and log.duration > 300
                    and log.createdAt > recent_cutoff
                ]
                long_chapters = []
                for d in recent_dwells[:2]:
                    try:
                        det = json.loads(d.detail or "{}")
                        long_chapters.append(det.get("title", "某章節"))
                    except (json.JSONDecodeError, TypeError):
                        long_chapters.append("某章節")

                if len(block_errors) >= 4 and len(block_errors) > last_block_error_count:
                    reason = f"你發現實習生一連拼錯了 {len(block_errors)} 次積木"
                    block_detail = block_errors[-1].detail or ""
                elif len(block_errors) >= 3 and len(block_errors) > last_block_error_count:
                    reason = f"你發現實習生連續拼錯積木達 {len(block_errors)} 次"
                elif long_chapters:
                    reason = f"你發現實習生在「{'、'.join(long_chapters)}」停留超過 5 分鐘，可能卡關了"
                elif total_duration > 300:
                    reason = f"你發現實習生在這裡待了 {total_duration} 秒還沒通關"

                if reason and reason != last_intervention_reason:
                    last_intervention_reason = reason
                    if block_errors:
                        last_block_error_count = len(block_errors)
                    await _intervene(reason, block_detail)
            except Exception:
                pass

    # ════════════════════════════════════════════
    # Authentication
    # ════════════════════════════════════════════
    try:
        auth_msg = await websocket.receive_json()
        jwt_token = auth_msg.get("token")
        course_id = auth_msg.get("course_id")

        if not jwt_token:
            await websocket.send_json({"error": "Missing token"})
            await websocket.close()
            return

        try:
            payload = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = int(payload.get("sub"))
        except (JWTError, ValueError, TypeError):
            await websocket.send_json({"error": "Invalid token"})
            await websocket.close()
            return

        if not client:
            await websocket.send_json({"error": "AI service not configured (missing API key)"})
            await websocket.close()
            return

        async with async_session() as db:
            course = await db.get(Course, course_id) if course_id else None
            course_title = course.title if course else "未知課程"

        # Start background intervention checker
        checker_task = asyncio.create_task(intervention_checker())

        # ════════════════════════════════════════════
        # Main message loop (event-driven)
        # ════════════════════════════════════════════
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "chat")

            if msg_type == "chat":
                last_student_msg_time = datetime.now(timezone.utc)
                question = data.get("content", "")
                if not question:
                    continue
                if question == "__ping__":
                    await websocket.send_text("__pong__")
                    continue
                session_events.append({"action": "ai_query", "detail": question[:100], "time": datetime.now(timezone.utc).isoformat()})
                await _chat(question)

            elif msg_type == "event":
                action = data.get("action", "")
                detail = data.get("detail", "")
                session_events.append({
                    "action": action,
                    "detail": detail,
                    "time": datetime.now(timezone.utc).isoformat(),
                })

                # Event-driven proactive triggers (no need to wait for 60s cycle)
                now = datetime.now(timezone.utc)
                if (now - last_intervention_time).total_seconds() < intervention_cooldown.total_seconds():
                    continue

                if action == "webhook_success":
                    await _intervene("實習生剛剛通過了一個 Webhook 挑戰！")
                elif action == "blockly_error":
                    same_count = sum(
                        1 for e in session_events[-5:]
                        if e.get("action") == "blockly_error" and e.get("detail") == detail
                    )
                    total_blockly_errors = sum(1 for e in session_events if e.get("action") == "blockly_error")
                    if total_blockly_errors >= 4:
                        await _intervene(f"你發現實習生一連拼錯了 {total_blockly_errors} 次積木", block_detail=detail)
                        session_events[:] = [e for e in session_events if e.get("action") != "blockly_error"]
                    elif total_blockly_errors >= 3:
                        await _intervene(f"你發現實習生連續拼錯積木達 {total_blockly_errors} 次")
                        session_events[:] = [e for e in session_events if e.get("action") != "blockly_error"]
                    elif same_count >= 2:
                        await _intervene(f"你注意實習生連續拼錯同一塊積木：{detail}")

            elif msg_type == "urgent_event":
                action = data.get("action", "未知事件")
                detail = data.get("detail", "")
                session_events.append({
                    "action": action,
                    "detail": detail,
                    "time": datetime.now(timezone.utc).isoformat(),
                })
                await _celebrate(action, detail)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
            await websocket.close()
        except RuntimeError:
            pass
    finally:
        stop_signal.set()
        if 'checker_task' in locals():
            checker_task.cancel()
