import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "dev.db")

TABLES = [
    ("users", ["id", "username", "role", "student_token"]),
    ("topics", ["id", "title", "orderIndex"]),
    ("courses", ["id", "topicId", "title", "unlockEvent", "orderIndex"]),
    ("chapters", ["id", "courseId", "title", "type", "orderIndex"]),
    ("learning_records", ["id", "userId", "courseId", "status", "chapters"]),
    ("behavior_logs", ["id", "userId", "courseId", "actionType", "detail", "duration", "createdAt"]),
    ("study_notes", ["id", "userId", "chapterId", "content", "createdAt"]),
    ("chapter_feedback", ["id", "userId", "chapterId", "rating", "difficulty", "comment"]),
    ("learning_goals", ["id", "userId", "weeklyTarget", "startDate", "endDate"]),
]


def fmt(val, width=30):
    if val is None:
        return "NULL".ljust(width)
    s = str(val)
    if len(s) > width:
        s = s[: width - 3] + "..."
    return s.ljust(width)


def print_box(title):
    n = max(len(title) + 4, 60)
    print(f"\n+{'=' * (n - 2)}+")
    print(f"|  {title}{' ' * (n - 4 - len(title))}|")
    print(f"+{'=' * (n - 2)}+")


def print_section(title):
    print(f"\n--- {title} {'-' * (55 - len(title))}")


def print_table(title, headers, rows, max_rows=15):
    print_section(title)
    if not rows:
        print("  (no data)")
        return

    col_w = [len(h) + 2 for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            s = str(val) if val is not None else "NULL"
            col_w[i] = max(col_w[i], min(len(s), 28) + 2)
    col_w = [min(w, 32) for w in col_w]

    sep = "+" + "+".join("-" * w for w in col_w) + "+"
    top = "+" + "+".join("=" * w for w in col_w) + "+"
    bot = "+" + "+".join("=" * w for w in col_w) + "+"
    hdr = "|" + "|".join(h.center(w) for h, w in zip(headers, col_w)) + "|"

    print(top)
    print(hdr)
    print(sep)

    for row in rows[:max_rows]:
        vals = []
        for i, val in enumerate(row):
            s = str(val) if val is not None else "NULL"
            if len(s) > col_w[i] - 2:
                s = s[: col_w[i] - 5] + "..."
            vals.append(s.center(col_w[i]))
        print("|" + "|".join(vals) + "|")

    if len(rows) > max_rows:
        print(f"|  ... total {len(rows)} rows, showing top {max_rows}{' ' * 35}|")
    print(bot)


def get_all(db, table, cols, limit=100):
    c = db.execute(f'SELECT {",".join(cols)} FROM "{table}" LIMIT {limit}')
    return c.fetchall()


def run():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database not found: {DB_PATH}")
        print("Run: cd backend && python seed.py")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.text_factory = str
    db = conn.cursor()
    print()
    print_box("Block-to-Script LMS — Database Inspector")

    # ── Schema Overview ──
    print_section("Schema Overview")
    for name, cols in TABLES:
        cnt = db.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
        print(f"  {name:.<30s} {cnt} rows")

    # ── Per-table dump ──
    for name, cols in TABLES:
        rows = get_all(db, name, cols)
        title_map = {
            "users": "Users",
            "topics": "Topics",
            "courses": "Courses",
            "chapters": "Chapters",
            "learning_records": "Learning Records",
            "behavior_logs": "Behavior Logs",
            "study_notes": "Study Notes",
            "chapter_feedback": "Chapter Feedback",
            "learning_goals": "Learning Goals",
        }
        headers = cols
        # truncate long fields
        processed = []
        for r in rows:
            r2 = list(r)
            for i, col in enumerate(cols):
                if col in ("content", "detail", "chapters", "student_token", "blocklyAnswer", "luaCode", "luaAnswers"):
                    if r2[i] and len(str(r2[i])) > 28:
                        r2[i] = str(r2[i])[:25] + "..."
                if col == "createdAt" and r2[i]:
                    try:
                        dt = datetime.fromisoformat(str(r2[i]).replace("Z", "+00:00").rsplit(".", 1)[0])
                        r2[i] = dt.strftime("%Y-%m-%d %H:%M")
                    except:
                        pass
                if col == "chapters" and r2[i]:
                    try:
                        d = json.loads(r2[i])
                        r2[i] = json.dumps(d, ensure_ascii=False)[:28]
                    except:
                        pass
            processed.append(tuple(r2))
        print_table(title_map.get(name, name), headers, processed)

    # ── Behavior stats ──
    print_section("Behavior Logs by actionType")
    rows = db.execute(
        "SELECT actionType, COUNT(*) AS cnt FROM behavior_logs GROUP BY actionType ORDER BY cnt DESC"
    ).fetchall()
    if rows:
        print_table("", ["actionType", "count"], rows)
    else:
        print("  (no records)")

    # ── JOIN queries ──
    print_section("SQL JOIN Queries")

    # ① Student course progress
    print("  [1] Student course progress")
    q1 = """
    SELECT u.username, c.title, lr.status
    FROM learning_records lr
    JOIN users u ON u.id = lr.userId
    JOIN courses c ON c.id = lr.courseId
    WHERE u.role = 'student'
    ORDER BY u.username, c.orderIndex
    """
    rows = db.execute(q1).fetchall()
    print_table("", ["username", "course", "status"], rows)

    # ② Chapter type distribution
    print("  [2] Chapter type distribution (per course)")
    q2 = """
    SELECT c.title AS course, ch.type, COUNT(*) AS count
    FROM chapters ch
    JOIN courses c ON c.id = ch.courseId
    GROUP BY c.id, ch.type
    ORDER BY c.orderIndex, ch.type
    """
    rows = db.execute(q2).fetchall()
    print_table("", ["course", "type", "count"], rows)

    # ③ Latest behavior logs
    print("  [3] Latest behavior logs (top 10)")
    q3 = """
    SELECT actionType, detail, duration, createdAt
    FROM behavior_logs
    ORDER BY createdAt DESC
    LIMIT 10
    """
    rows = db.execute(q3).fetchall()
    processed = []
    for r in rows:
        detail = str(r[1])[:28] + "..." if r[1] and len(str(r[1])) > 31 else r[1]
        ts = str(r[3])[:19] if r[3] else ""
        processed.append((r[0], detail, r[2] or 0, ts))
    print_table("", ["actionType", "detail", "duration", "createdAt"], processed)

    conn.close()
    print(f"\n{'=' * 62}")
    print(f"  Database: {DB_PATH}")


if __name__ == "__main__":
    run()
