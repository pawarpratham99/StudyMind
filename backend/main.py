import os
import json
import re
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from hindsight_client import Hindsight
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_groq():
    return Groq(api_key=os.getenv("GROQ_API_KEY", ""))

def get_hindsight():
    return Hindsight(
        api_key=os.getenv("HINDSIGHT_API_KEY", ""),
        base_url=os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
    )

GROQ_MODEL = "qwen/qwen3-32b"

def ensure_bank(bank_id: str):
    try:
        get_hindsight().create_bank(bank_id=bank_id)
    except Exception:
        pass

def strip_think(text: str) -> str:
    """Remove <think>...</think> blocks from model output."""
    if "</think>" in text:
        return text.split("</think>")[-1].strip()
    return text.strip()

def parse_json(content: str):
    """Strip markdown fences and parse JSON."""
    try:
        content = re.sub(r"```(?:json)?", "", content).replace("```", "").strip()
        return json.loads(content)
    except Exception:
        return None

def recall_memories(bank_id: str, query: str) -> str:
    """Safe recall — returns empty string on any error."""
    try:
        hs = get_hindsight()
        resp = hs.recall(bank_id=bank_id, query=query)
        results = getattr(resp, 'results', []) or []
        texts = [getattr(m, 'text', '') for m in results if getattr(m, 'text', '')]
        return "\n".join(texts)
    except Exception as e:
        print(f"[Recall skipped] {e}")
        return ""

def retain_memory(bank_id: str, content: str):
    """Safe retain — silently fails."""
    try:
        get_hindsight().retain(bank_id=bank_id, content=content)
    except Exception as e:
        print(f"[Retain skipped] {e}")

# ─── Models ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    userId: str
    message: str

class QuizGenRequest(BaseModel):
    userId: str
    subject: str
    difficulty: str

class QuizSubmitRequest(BaseModel):
    userId: str
    subject: str
    results: list

# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/chat")
def chat(req: ChatRequest, background_tasks: BackgroundTasks):
    ensure_bank(req.userId)
    groq = get_groq()

    known_weaknesses = recall_memories(req.userId, req.message)

    sys_prompt = "You are StudyMind, an encouraging AI tutor. Be clear, concise, and helpful."
    if known_weaknesses:
        sys_prompt += f"\n\nStudent's known past context and weak areas:\n{known_weaknesses}"

    completion = groq.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": req.message}
        ]
    )
    reply = strip_think(completion.choices[0].message.content)

    def background_retain():
        try:
            summary_prompt = (
                f"Summarize what the student asked for memory. "
                f"Student: {req.message}\nTutor: {reply}\nSummary:"
            )
            g = get_groq()
            sc = g.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": summary_prompt}]
            )
            retain_memory(req.userId, strip_think(sc.choices[0].message.content))
        except Exception as e:
            print(f"[Background retain error] {e}")

    background_tasks.add_task(background_retain)
    return {"reply": reply}


@app.post("/quiz/generate")
def generate_quiz(req: QuizGenRequest):
    ensure_bank(req.userId)
    groq = get_groq()

    weak_context = recall_memories(req.userId, f"weak topics in {req.subject}")

    prompt = (
        f"Generate exactly 5 multiple choice questions for '{req.subject}' at {req.difficulty} difficulty."
    )
    if weak_context:
        prompt += f"\nFocus on these known weak areas:\n{weak_context}"
    prompt += (
        "\n\nReturn ONLY a valid JSON array with exactly 5 objects. No markdown, no explanation."
        "\nEach object must have these exact keys: "
        '"question" (string), "options" (array of 4 strings), '
        '"correct_answer" (string, must match one option exactly), '
        '"explanation" (string), "topic" (string).'
    )

    def try_generate(extra_instruction=""):
        c = groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt + extra_instruction}]
        )
        raw = strip_think(c.choices[0].message.content)
        return parse_json(raw)

    parsed = try_generate()
    if not parsed:
        parsed = try_generate("\n\nCRITICAL: Output ONLY raw JSON. No text before or after.")
    if not parsed:
        raise HTTPException(status_code=500, detail="Failed to generate valid quiz JSON after retry.")

    return {"questions": parsed}


@app.post("/quiz/submit")
def submit_quiz(req: QuizSubmitRequest, background_tasks: BackgroundTasks):
    ensure_bank(req.userId)
    correct_count = sum(1 for r in req.results if r.get("is_correct"))
    wrong_count = len(req.results) - correct_count

    def retain_results():
        for res in req.results:
            topic = res.get("topic", "unknown")
            c_ans = res.get("correct_answer", "")
            u_ans = res.get("user_answer", "")
            if res.get("is_correct"):
                retain_memory(req.userId, f"Student correctly answered a question about '{topic}' in {req.subject}.")
            else:
                retain_memory(req.userId, f"Student got '{topic}' wrong in {req.subject}. They chose '{u_ans}' but correct was '{c_ans}'.")

    background_tasks.add_task(retain_results)
    return {"correct": correct_count, "wrong": wrong_count}


@app.get("/study-plan/{userId}")
def study_plan(userId: str):
    ensure_bank(userId)
    groq = get_groq()

    # Reflect
    insight = ""
    try:
        hs = get_hindsight()
        reflect_resp = hs.reflect(bank_id=userId, query="Synthesize insights about the student's overall weaknesses and mistakes.")
        insight = getattr(reflect_resp, 'text', '') or str(reflect_resp)
    except Exception as e:
        print(f"[Reflect skipped] {e}")

    mistakes = recall_memories(userId, "recent mistakes and wrong answers")

    prompt = "Generate a personalized 7-day study plan for this student.\n"
    if insight:
        prompt += f"\nInsights from memory analysis:\n{insight}\n"
    if mistakes:
        prompt += f"\nRecent mistakes to address:\n{mistakes}\n"
    if not insight and not mistakes:
        prompt += "\nNo memory data yet — generate a balanced general study plan.\n"

    prompt += (
        "\nReturn ONLY a valid JSON array of exactly 7 objects. No markdown, no extra text."
        '\nEach object: {"day": 1, "subject": "...", "topics": ["..."], "duration": 45, "priority": "high", "reason": "..."}'
        '\npriority must be one of: "high", "medium", "low"'
    )

    def try_plan(extra=""):
        c = groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt + extra}]
        )
        raw = strip_think(c.choices[0].message.content)
        return parse_json(raw)

    parsed = try_plan()
    if not parsed:
        parsed = try_plan("\n\nCRITICAL: Output ONLY raw JSON array. Absolutely no extra text.")
    if not parsed:
        raise HTTPException(status_code=500, detail="Failed to parse study plan JSON.")

    return {"plan": parsed}


@app.get("/memory/{userId}")
def get_memory(userId: str):
    ensure_bank(userId)
    try:
        hs = get_hindsight()
        resp = hs.list_memories(bank_id=userId)
        memories = getattr(resp, 'results', resp) or []
        mems = [getattr(m, 'text', getattr(m, 'content', str(m))) for m in memories]
        return {"memories": mems}
    except Exception as e:
        print(f"[List memories error] {e}")
        return {"memories": [], "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
