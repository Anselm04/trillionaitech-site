"""Pluggable email service.

Providers supported: 'resend' (if RESEND_API_KEY is set), 'smtp' (if SMTP_* set), else 'console'.
The 'console' provider logs the message to stdout — used in dev / until a real provider is wired.
No email sending EVER blocks the request path — always call from background task.
"""
from __future__ import annotations
import os
import json
import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

logger = logging.getLogger("trillion.email")

FROM_EMAIL = os.environ.get("EMAIL_FROM", "hello@trillionaitech.com")
FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Trillion AI Tech")


def _provider() -> str:
    if os.environ.get("RESEND_API_KEY"):
        return "resend"
    if os.environ.get("SMTP_HOST"):
        return "smtp"
    return "console"


def _send_console(to: str, subject: str, html: str, text: Optional[str]) -> bool:
    logger.info("[email:console] to=%s subject=%s\n---\n%s\n---", to, subject, text or html)
    return True


def _send_resend(to: str, subject: str, html: str, text: Optional[str]) -> bool:
    import urllib.request, urllib.error
    api_key = os.environ["RESEND_API_KEY"]
    payload = {
        "from": f"{FROM_NAME} <{FROM_EMAIL}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            r.read()
            return True
    except urllib.error.HTTPError as e:
        logger.error("Resend HTTPError %s: %s", e.code, e.read()[:200])
    except Exception as e:
        logger.error("Resend error: %s", e)
    return False


def _send_smtp(to: str, subject: str, html: str, text: Optional[str]) -> bool:
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    msg = EmailMessage()
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text or "This email requires an HTML client.")
    msg.add_alternative(html, subtype="html")
    try:
        with smtplib.SMTP(host, port, timeout=10) as s:
            s.starttls(context=ssl.create_default_context())
            if username and password:
                s.login(username, password)
            s.send_message(msg)
        return True
    except Exception as e:
        logger.error("SMTP error: %s", e)
        return False


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    prov = _provider()
    if prov == "resend":
        return _send_resend(to, subject, html, text)
    if prov == "smtp":
        return _send_smtp(to, subject, html, text)
    return _send_console(to, subject, html, text)


def render_email(*, heading: str, body_html: str, cta_url: Optional[str] = None, cta_label: Optional[str] = None) -> str:
    cta_block = ""
    if cta_url and cta_label:
        cta_block = f"""
        <div style="margin:32px 0;">
          <a href="{cta_url}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;
             text-decoration:none;font-weight:600;font-family:sans-serif;border-radius:6px;">{cta_label}</a>
        </div>
        """
    return f"""
<!doctype html>
<html><body style="background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;margin:0;padding:40px 16px;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#0a0a0a;">
    <tr><td>
      <div style="font-weight:900;letter-spacing:-0.02em;font-size:14px;color:#fff;">TRILLION AI TECH</div>
      <div style="font-size:9px;letter-spacing:0.25em;color:#888;font-weight:600;margin-top:4px;">STUDIO · AOTEAROA</div>
    </td></tr>
    <tr><td style="padding:32px 0 0 0;">
      <h1 style="font-size:28px;color:#fff;letter-spacing:-0.02em;margin:0 0 16px 0;">{heading}</h1>
      <div style="color:#c4c4c4;line-height:1.6;font-size:15px;">{body_html}</div>
      {cta_block}
    </td></tr>
    <tr><td style="padding:48px 0 0 0;border-top:1px solid #1a1a1a;color:#666;font-size:12px;">
      You're receiving this because you signed up on trillionaitech.com.<br/>
      Trillion AI Tech · Aotearoa, New Zealand
    </td></tr>
  </table>
</body></html>
"""
