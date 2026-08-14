"""AppForge — real AI-powered app scaffold generator.

Given a natural-language prompt, uses Claude Sonnet 4.6 (Emergent LLM key) to design a starter
project and returns downloadable file contents. Access is gated: admin OR user with an active
entitlement for the 'appforge' product.
"""
from __future__ import annotations
import os
import io
import json
import zipfile
import logging
import secrets
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Literal
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from access_codes import user_has_access

logger = logging.getLogger("trillion.appforge")

APPFORGE_SLUG = "appforge"
APPFORGE_TIER_SLUGS = ["appforge-starter", "appforge-builder", "appforge-studio"]
MAX_PROMPT_LEN = 1000
MAX_FILES = 20
MAX_FILE_BYTES = 30_000

ProjectKind = Literal["webapp", "landing", "api", "game", "cli", "agent"]

SYSTEM = """You are AppForge, a senior full-stack architect. Given a natural-language brief, design a MINIMAL but working starter project.

STRICT OUTPUT RULES:
1. Reply with ONE JSON object only. No prose, no backticks, no markdown fences.
2. Schema:
{
  "name": "kebab-case project name",
  "kind": "webapp|landing|api|game|cli|agent",
  "summary": "one-sentence description",
  "stack": "brief stack summary (e.g., 'React + FastAPI + MongoDB' or 'HTML + Canvas game')",
  "files": [
    {"path": "relative/file/path", "content": "full file contents as a single string"}
  ],
  "run_instructions": "3-6 lines: how to run the project locally"
}
3. Include a README.md, a package/deps file (package.json / requirements.txt / etc.), and 3-8 core source files.
4. Total files: 5-12. Each file: under 30 KB, ideally 100-400 lines. Fewer, focused files beat many stubs.
5. Real, runnable code only. No placeholders like TODO or ellipses. Include imports.
6. For webapps use plain React (create-react-app compatible) + Tailwind (CDN if needed) — no build tooling assumptions.
7. For games use a single index.html with inline canvas + JS. No external assets.
8. For APIs use FastAPI with a single server.py.
9. Never invent secrets or hardcode API keys — use env vars with clear placeholder names.
10. Keep code opinionated, elegant and production-shaped."""


class GenerateIn(BaseModel):
    prompt: str = Field(min_length=8, max_length=MAX_PROMPT_LEN)
    kind: Optional[ProjectKind] = None


class RefineIn(BaseModel):
    gen_id: str = Field(min_length=1)
    instructions: str = Field(min_length=4, max_length=MAX_PROMPT_LEN)


class UpdateFileIn(BaseModel):
    path: str = Field(min_length=1, max_length=200)
    content: str = Field(max_length=MAX_FILE_BYTES)


def _clean_files(raw_files) -> List[dict]:
    files = []
    for f in raw_files[:MAX_FILES]:
        if not isinstance(f, dict):
            continue
        path = str(f.get("path", "")).strip().lstrip("/")
        content = f.get("content", "")
        if not path or ".." in path.split("/") or not isinstance(content, str):
            continue
        # Enforce single-file byte cap
        if len(content.encode("utf-8")) > MAX_FILE_BYTES:
            content = content[:MAX_FILE_BYTES] + "\n// truncated by AppForge for safety\n"
        files.append({"path": path, "content": content})
    return files


async def _generate_with_llm(prompt: str, kind: Optional[str]) -> dict:
    """Call Claude Sonnet 4.6 via emergentintegrations and return validated JSON."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(503, "AppForge is not configured (missing LLM key)")

    session_id = f"appforge-{secrets.token_hex(8)}"
    chat = (
        LlmChat(api_key=api_key, session_id=session_id, system_message=SYSTEM)
        .with_model("anthropic", "claude-sonnet-4-6")
    )

    hint = f"\n\nProject kind hint: {kind}" if kind else ""
    user_msg = UserMessage(
        text=f"Brief: {prompt.strip()}{hint}\n\nReturn the JSON now — remember: JSON only, no fences."
    )

    # Non-streaming for structured output; ~60s ceiling
    try:
        raw = await asyncio.wait_for(chat.send_message(user_msg), timeout=90)
    except asyncio.TimeoutError:
        raise HTTPException(504, "AppForge timed out generating the project — try a shorter brief")
    except Exception as e:
        logger.exception("AppForge LLM error")
        raise HTTPException(502, f"AppForge upstream error: {type(e).__name__}")

    text = raw.strip() if isinstance(raw, str) else str(raw)
    # Strip accidental code fences the model may still add
    if text.startswith("```"):
        text = text.strip("`")
        # remove language hint like 'json\n'
        if "\n" in text:
            first_nl = text.index("\n")
            first_line = text[:first_nl].strip().lower()
            if first_line in ("json", "javascript", ""):
                text = text[first_nl + 1:]
        if text.endswith("```"):
            text = text[:-3]
    text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Try to find the outermost JSON object
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                data = json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                logger.warning("AppForge returned non-JSON, length=%d", len(text))
                raise HTTPException(502, "AppForge returned malformed output — please try again")
        else:
            raise HTTPException(502, "AppForge returned malformed output — please try again")

    files = _clean_files(data.get("files") or [])
    if not files:
        raise HTTPException(502, "AppForge produced no files — please try a more specific brief")

    return {
        "name": str(data.get("name", "generated-app"))[:80],
        "kind": data.get("kind") or kind or "webapp",
        "summary": str(data.get("summary", ""))[:280],
        "stack": str(data.get("stack", ""))[:200],
        "files": files,
        "run_instructions": str(data.get("run_instructions", ""))[:2000],
    }


def _make_zip(project: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in project["files"]:
            zf.writestr(f["path"], f["content"])
        readme = (
            f"# {project['name']}\n\n"
            f"{project.get('summary', '')}\n\n"
            f"**Stack**: {project.get('stack', '')}\n\n"
            f"## Run\n{project.get('run_instructions', '')}\n\n"
            f"---\nGenerated by AppForge · Trillion AI Tech\n"
        )
        # Only add auto-README if the model didn't include one
        if not any(f["path"].lower() in ("readme.md", "readme") for f in project["files"]):
            zf.writestr("README.md", readme)
    return buf.getvalue()


async def _appforge_has_access(db, user: Optional[dict]) -> bool:
    """User can use AppForge if admin OR has active entitlement to ANY appforge tier OR universal code."""
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    e = await db.entitlements.find_one({
        "user_id": user["id"],
        "active": True,
        "$or": [
            {"product_slug": {"$in": APPFORGE_TIER_SLUGS}},
            {"product_slug": "__universal__"},
        ],
    })
    return e is not None


REFINE_SYSTEM = """You are AppForge in refine mode. You will receive an EXISTING project and refinement instructions.

Return ONE JSON object with the same schema as before:
{"name","kind","summary","stack","files":[{"path","content"}],"run_instructions"}

STRICT RULES:
1. Preserve files that don't need to change — return them WITH THEIR ORIGINAL CONTENT.
2. Modify only what the instructions request.
3. Add new files if the instructions require them.
4. Do NOT return a diff; return the full new file list.
5. Same size limits: 5-12 files, each under 30 KB.
6. JSON only, no fences, no prose.
7. If the instruction asks for something incompatible with the project kind, add a comment in the README explaining what changed."""


async def _refine_with_llm(prev: dict, instructions: str) -> dict:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(503, "AppForge is not configured (missing LLM key)")

    session_id = f"appforge-refine-{secrets.token_hex(8)}"
    chat = (
        LlmChat(api_key=api_key, session_id=session_id, system_message=REFINE_SYSTEM)
        .with_model("anthropic", "claude-sonnet-4-6")
    )
    project_json = json.dumps({
        "name": prev.get("project_name"),
        "kind": prev.get("project_kind"),
        "summary": prev.get("summary"),
        "stack": prev.get("stack"),
        "files": prev.get("files", []),
    })
    user_msg = UserMessage(
        text=(
            f"EXISTING PROJECT:\n{project_json}\n\n"
            f"REFINEMENT INSTRUCTIONS:\n{instructions.strip()}\n\n"
            "Return the updated full JSON now."
        )
    )
    try:
        raw = await asyncio.wait_for(chat.send_message(user_msg), timeout=120)
    except asyncio.TimeoutError:
        raise HTTPException(504, "AppForge timed out refining the project — try a smaller change")
    except Exception:
        logger.exception("AppForge refine LLM error")
        raise HTTPException(502, "AppForge upstream error")

    text = raw.strip() if isinstance(raw, str) else str(raw)
    if text.startswith("```"):
        text = text.strip("`")
        if "\n" in text:
            first = text.index("\n"); head = text[:first].strip().lower()
            if head in ("json", ""):
                text = text[first + 1:]
        if text.endswith("```"):
            text = text[:-3]
    text = text.strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        s, e = text.find("{"), text.rfind("}")
        if s != -1 and e > s:
            data = json.loads(text[s:e + 1])
        else:
            raise HTTPException(502, "AppForge returned malformed output — try again")
    files = _clean_files(data.get("files") or [])
    if not files:
        raise HTTPException(502, "AppForge refine produced no files")
    return {
        "name": str(data.get("name") or prev.get("project_name", "generated-app"))[:80],
        "kind": data.get("kind") or prev.get("project_kind") or "webapp",
        "summary": str(data.get("summary", prev.get("summary", "")))[:280],
        "stack": str(data.get("stack", prev.get("stack", "")))[:200],
        "files": files,
        "run_instructions": str(data.get("run_instructions", prev.get("run_instructions", "")))[:2000],
    }


def _build_preview_html(project: dict) -> Optional[str]:
    """Return a single HTML document that can be rendered in an iframe, if the project supports it.

    Supported kinds: 'game', 'landing', 'webapp' (best-effort).
    """
    kind = (project.get("project_kind") or project.get("kind") or "").lower()
    files = project.get("files") or []
    if not files:
        return None
    # Find an entry HTML file
    html_file = next((f for f in files if f["path"].lower().endswith("index.html")), None)
    if not html_file:
        html_file = next((f for f in files if f["path"].lower().endswith(".html")), None)
    if not html_file:
        return None
    html = html_file["content"]
    # Inline any local .css and .js referenced with relative paths
    import re as _re
    others = {f["path"].split("/")[-1]: f for f in files if f is not html_file}

    def replace_link(m):
        href = m.group(1).split("/")[-1]
        f = others.get(href)
        if f and href.lower().endswith(".css"):
            return f'<style>{f["content"]}</style>'
        return m.group(0)

    def replace_script(m):
        src = m.group(1).split("/")[-1]
        f = others.get(src)
        if f and src.lower().endswith(".js"):
            return f'<script>{f["content"]}</script>'
        return m.group(0)

    html = _re.sub(r'<link[^>]+href="([^"]+\.css)"[^>]*>', replace_link, html, flags=_re.IGNORECASE)
    html = _re.sub(r'<script[^>]+src="([^"]+\.js)"[^>]*></script>', replace_script, html, flags=_re.IGNORECASE)
    return html


def build_appforge_router(db, get_current_user, get_optional_user, audit):
    r = APIRouter()

    @r.get("/appforge/access")
    async def check_access(user=Depends(get_optional_user)):
        """Client-side hint about whether the user can generate. Not a security boundary."""
        if not user:
            return {"has_access": False, "reason": "signin_required", "tiers": APPFORGE_TIER_SLUGS}
        has = await _appforge_has_access(db, user)
        return {"has_access": has, "reason": None if has else "subscribe_or_code_required",
                "tiers": APPFORGE_TIER_SLUGS, "is_admin": user.get("role") == "admin"}

    @r.post("/appforge/generate")
    async def generate(payload: GenerateIn, user=Depends(get_current_user)):
        has = await _appforge_has_access(db, user)
        if not has:
            raise HTTPException(402, "AppForge requires an active subscription or access code")
        project = await _generate_with_llm(payload.prompt, payload.kind)
        gen_id = secrets.token_urlsafe(10)
        await db.appforge_generations.insert_one({
            "gen_id": gen_id,
            "user_id": user["id"],
            "prompt": payload.prompt,
            "kind": payload.kind,
            "project_name": project["name"],
            "project_kind": project["kind"],
            "summary": project["summary"],
            "stack": project["stack"],
            "files": project["files"],
            "run_instructions": project["run_instructions"],
            "created_at": datetime.now(timezone.utc),
        })
        await audit(user["id"], "appforge.generate", gen_id,
                    {"name": project["name"], "kind": project["kind"], "files": len(project["files"])})
        return {
            "gen_id": gen_id,
            "name": project["name"],
            "kind": project["kind"],
            "summary": project["summary"],
            "stack": project["stack"],
            "files": project["files"],
            "file_count": len(project["files"]),
            "run_instructions": project["run_instructions"],
            "download_url": f"/api/appforge/download/{gen_id}",
            "preview_available": bool(_build_preview_html({"project_kind": project["kind"], "files": project["files"]})),
        }

    @r.get("/appforge/generations")
    async def my_generations(user=Depends(get_current_user)):
        out = []
        async for d in db.appforge_generations.find({"user_id": user["id"]}).sort("created_at", -1).limit(30):
            out.append({
                "gen_id": d["gen_id"],
                "name": d.get("project_name"),
                "kind": d.get("project_kind"),
                "summary": d.get("summary"),
                "stack": d.get("stack"),
                "file_count": len(d.get("files", [])),
                "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at"),
                "download_url": f"/api/appforge/download/{d['gen_id']}",
            })
        return out

    @r.get("/appforge/download/{gen_id}")
    async def download(gen_id: str, user=Depends(get_current_user)):
        d = await db.appforge_generations.find_one({"gen_id": gen_id})
        if not d:
            raise HTTPException(404, "Generation not found")
        # Owner or admin only
        if d["user_id"] != user["id"] and user.get("role") != "admin":
            raise HTTPException(403, "Not your generation")
        project = {
            "name": d.get("project_name", "generated-app"),
            "summary": d.get("summary", ""),
            "stack": d.get("stack", ""),
            "files": d.get("files", []),
            "run_instructions": d.get("run_instructions", ""),
        }
        blob = _make_zip(project)
        filename = f"{project['name']}.zip"
        return Response(
            content=blob,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    @r.get("/appforge/generations/{gen_id}")
    async def get_generation(gen_id: str, user=Depends(get_current_user)):
        d = await db.appforge_generations.find_one({"gen_id": gen_id})
        if not d:
            raise HTTPException(404, "Not found")
        if d["user_id"] != user["id"] and user.get("role") != "admin":
            raise HTTPException(403, "Not your generation")
        return {
            "gen_id": d["gen_id"],
            "name": d.get("project_name"),
            "kind": d.get("project_kind"),
            "summary": d.get("summary"),
            "stack": d.get("stack"),
            "files": d.get("files", []),
            "run_instructions": d.get("run_instructions"),
            "preview_available": bool(_build_preview_html({"project_kind": d.get("project_kind"), "files": d.get("files")})),
            "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at"),
        }

    @r.get("/appforge/preview/{gen_id}", response_class=Response)
    async def preview(gen_id: str, user=Depends(get_optional_user)):
        # gen_id is a 10-char token_urlsafe (~60 bits entropy) — treat it as a capability URL
        # for the preview iframe. If the caller is authenticated and NOT the owner (and not admin),
        # deny. Anonymous requests are allowed because iframes may not include auth headers/cookies
        # in some browser configurations; the unguessable gen_id remains the primary boundary.
        d = await db.appforge_generations.find_one({"gen_id": gen_id})
        if not d:
            raise HTTPException(404, "Not found")
        if user and user.get("role") != "admin" and d["user_id"] != user["id"]:
            raise HTTPException(403, "Not your generation")
        html = _build_preview_html({"project_kind": d.get("project_kind"), "files": d.get("files")})
        if not html:
            raise HTTPException(400, "This project kind does not support live preview")
        return Response(
            content=html,
            media_type="text/html",
            headers={
                "X-Frame-Options": "SAMEORIGIN",
                "Content-Security-Policy": "default-src 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src * data:; connect-src *;",
                "Cache-Control": "no-store",
            },
        )

    @r.put("/appforge/generations/{gen_id}/files")
    async def update_file(gen_id: str, payload: UpdateFileIn, user=Depends(get_current_user)):
        d = await db.appforge_generations.find_one({"gen_id": gen_id})
        if not d:
            raise HTTPException(404, "Not found")
        if d["user_id"] != user["id"] and user.get("role") != "admin":
            raise HTTPException(403, "Not your generation")
        files = list(d.get("files") or [])
        # Path safety
        p = payload.path.strip().lstrip("/")
        if ".." in p.split("/"):
            raise HTTPException(400, "Invalid path")
        found = False
        for i, f in enumerate(files):
            if f.get("path") == p:
                files[i] = {"path": p, "content": payload.content}
                found = True
                break
        if not found:
            if len(files) >= MAX_FILES:
                raise HTTPException(413, "Too many files")
            files.append({"path": p, "content": payload.content})
        await db.appforge_generations.update_one(
            {"gen_id": gen_id},
            {"$set": {"files": files, "updated_at": datetime.now(timezone.utc)}},
        )
        await audit(user["id"], "appforge.file_update", gen_id, {"path": p, "created": not found})
        return {"ok": True, "file_count": len(files)}

    @r.post("/appforge/refine")
    async def refine(payload: RefineIn, user=Depends(get_current_user)):
        has = await _appforge_has_access(db, user)
        if not has:
            raise HTTPException(402, "AppForge requires an active subscription or access code")
        prev = await db.appforge_generations.find_one({"gen_id": payload.gen_id})
        if not prev:
            raise HTTPException(404, "Generation not found")
        if prev["user_id"] != user["id"] and user.get("role") != "admin":
            raise HTTPException(403, "Not your generation")
        refined = await _refine_with_llm(prev, payload.instructions)
        gen_id = secrets.token_urlsafe(10)
        await db.appforge_generations.insert_one({
            "gen_id": gen_id,
            "user_id": user["id"],
            "prompt": payload.instructions,
            "kind": refined["kind"],
            "parent_gen_id": payload.gen_id,
            "project_name": refined["name"],
            "project_kind": refined["kind"],
            "summary": refined["summary"],
            "stack": refined["stack"],
            "files": refined["files"],
            "run_instructions": refined["run_instructions"],
            "created_at": datetime.now(timezone.utc),
        })
        await audit(user["id"], "appforge.refine", gen_id, {"parent": payload.gen_id, "files": len(refined["files"])})
        return {
            "gen_id": gen_id,
            "parent_gen_id": payload.gen_id,
            "name": refined["name"],
            "kind": refined["kind"],
            "summary": refined["summary"],
            "stack": refined["stack"],
            "files": refined["files"],
            "file_count": len(refined["files"]),
            "run_instructions": refined["run_instructions"],
            "download_url": f"/api/appforge/download/{gen_id}",
            "preview_available": bool(_build_preview_html({"project_kind": refined["kind"], "files": refined["files"]})),
        }

    return r
