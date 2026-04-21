import json
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
QUIZ_DATA_PATH = BASE_DIR / "data" / "quiz_questions_data.json"
ACTIVITY_LOG_PATH = BASE_DIR / "data" / "gituser_activity_log.json"


def load_quiz_data():
    with QUIZ_DATA_PATH.open("r", encoding="utf-8") as f:
        payload = json.load(f)
    return payload.get("quiz", [])


def append_activity(event_type, gituser, details):
    ACTIVITY_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing_events = []

    if ACTIVITY_LOG_PATH.exists():
        with ACTIVITY_LOG_PATH.open("r", encoding="utf-8") as f:
            try:
                existing_events = json.load(f)
            except json.JSONDecodeError:
                existing_events = []

    existing_events.append(
        {
            "event_type": event_type,
            "gituser": gituser or "anonymous",
            "details": details,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }
    )

    with ACTIVITY_LOG_PATH.open("w", encoding="utf-8") as f:
        json.dump(existing_events, f, indent=2)


@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"


@app.route("/quiz")
def quiz_home():
    return render_template("quiz_home.html")


@app.route("/quiz/learn/<int:page_id>")
def learn_page(page_id):
    return render_template("learn.html", page_id=page_id)


@app.route("/quiz/question/<int:question_id>")
def quiz_page(question_id):
    return render_template("quiz.html", question_id=question_id)


@app.route("/quiz/end")
def quiz_results_page():
    return render_template("quiz_results.html")


@app.get("/api/quiz/<int:question_id>")
def get_question(question_id):
    questions = load_quiz_data()
    question = next((q for q in questions if q["id"] == question_id), None)

    if question is None:
        return jsonify({"error": "Question not found"}), 404

    return jsonify(
        {
            "question": question,
            "total_questions": len(questions),
        }
    )


@app.post("/api/activity/learn-visit")
def log_learn_visit():
    payload = request.get_json(silent=True) or {}
    gituser = payload.get("gituser")
    page_id = payload.get("page_id")
    append_activity("learn_visit", gituser, {"page_id": page_id})
    return jsonify({"ok": True})


@app.post("/api/activity/quiz-answer")
def log_quiz_answer():
    payload = request.get_json(silent=True) or {}
    gituser = payload.get("gituser")
    question_id = payload.get("question_id")
    selected_choice = payload.get("selected_choice")

    questions = load_quiz_data()
    question = next((q for q in questions if q["id"] == question_id), None)
    if question is None:
        return jsonify({"error": "Question not found"}), 404

    is_correct = selected_choice == question["correct_answer"]
    append_activity(
        "quiz_answer",
        gituser,
        {
            "question_id": question_id,
            "selected_choice": selected_choice,
            "correct_answer": question["correct_answer"],
            "is_correct": is_correct,
        },
    )

    return jsonify(
        {
            "ok": True,
            "is_correct": is_correct,
            "correct_answer": question["correct_answer"],
            "feedback": question["feedback"],
            "next_id": question["next_id"],
        }
    )


if __name__ == "__main__":
    app.run(debug=True)