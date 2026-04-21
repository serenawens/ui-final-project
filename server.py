import json
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
QUIZ_DATA_PATH = BASE_DIR / "data" / "quiz_questions_data.json"
LEARNING_DATA_PATH = BASE_DIR / "data" / "learning-data.json"
ACTIVITY_LOG_PATH = BASE_DIR / "data" / "activity_log.json"
LEGACY_ACTIVITY_LOG_PATH = BASE_DIR / "data" / "gituser_activity_log.json"


def load_quiz_data():
    with QUIZ_DATA_PATH.open("r", encoding="utf-8") as f:
        payload = json.load(f)
    return payload.get("quiz", [])


def load_learning_data():
    with LEARNING_DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def append_activity(event_type, uni, details):
    ACTIVITY_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing_events = []

    source_path = ACTIVITY_LOG_PATH if ACTIVITY_LOG_PATH.exists() else LEGACY_ACTIVITY_LOG_PATH
    if source_path.exists():
        with source_path.open("r", encoding="utf-8") as f:
            try:
                existing_events = json.load(f)
            except json.JSONDecodeError:
                existing_events = []

    existing_events.append(
        {
            "event_type": event_type,
            "uni": uni or "anonymous",
            "details": details,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }
    )

    with ACTIVITY_LOG_PATH.open("w", encoding="utf-8") as f:
        json.dump(existing_events, f, indent=2)


@app.route("/")
def home_page():
    learning_data = load_learning_data()
    return render_template(
        "homepage.html",
        categories=learning_data.get("categories", []),
    )


@app.route("/quiz")
def quiz_home():
    return render_template("quiz_home.html")


@app.route("/quiz/<material_id>")
def quiz_home_for_material(material_id):
    learning_data = load_learning_data()
    categories = learning_data.get("categories", [])
    category = next((c for c in categories if c["id"] == material_id), None)
    if category is None:
        return render_template("quiz_home.html")
    return render_template("quiz_home.html", selected_material=category)


@app.route("/learn/<material_id>/")
def learn_material(material_id):
    learning_data = load_learning_data()
    categories = learning_data.get("categories", [])
    category = next((c for c in categories if c["id"] == material_id), None)
    if category is None:
        return render_template("homepage.html", categories=categories), 404

    washer_settings = learning_data.get("washer_settings", {}).get(material_id, {})
    dryer_rows = next(
        (entry.get("settings", []) for entry in learning_data.get("dryer_settings", []) if entry.get("id") == material_id),
        [],
    )
    pro_tips = next(
        (entry.get("tips", []) for entry in learning_data.get("pro_tips", []) if entry.get("id") == material_id),
        [],
    )

    return render_template(
        "learn.html",
        category=category,
        all_categories=categories,
        care_symbols=learning_data.get("care_label_symbols", []),
        washer_settings=washer_settings,
        dryer_settings=dryer_rows,
        pro_tips=pro_tips,
        common_mistakes=learning_data.get("common_mistakes", []),
    )


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
    uni = payload.get("uni")
    material_id = payload.get("material_id")
    append_activity("learn_visit", uni, {"material_id": material_id})
    return jsonify({"ok": True})


@app.post("/api/activity/learn-selection")
def log_learn_selection():
    payload = request.get_json(silent=True) or {}
    uni = payload.get("uni")
    material_id = payload.get("material_id")
    append_activity("learn_selection", uni, {"material_id": material_id})
    return jsonify({"ok": True})


@app.post("/api/activity/learn-step")
def log_learn_step():
    payload = request.get_json(silent=True) or {}
    uni = payload.get("uni")
    material_id = payload.get("material_id")
    step_id = payload.get("step_id")
    append_activity(
        "learn_step_view",
        uni,
        {
            "material_id": material_id,
            "step_id": step_id,
        },
    )
    return jsonify({"ok": True})


@app.post("/api/activity/quiz-answer")
def log_quiz_answer():
    payload = request.get_json(silent=True) or {}
    uni = payload.get("uni")
    question_id = payload.get("question_id")
    selected_choice = payload.get("selected_choice")

    questions = load_quiz_data()
    question = next((q for q in questions if q["id"] == question_id), None)
    if question is None:
        return jsonify({"error": "Question not found"}), 404

    is_correct = selected_choice == question["correct_answer"]
    append_activity(
        "quiz_answer",
        uni,
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