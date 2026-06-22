import logging
import os
import smtplib
from email.message import EmailMessage

log = logging.getLogger("notely.email")


def email_enabled() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM"))


def send_email(*, to_email: str, subject: str, text_body: str) -> tuple[bool, str | None]:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() != "false"

    if not host or not from_email:
        return False, "SMTP is not configured"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(text_body)

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            if use_tls:
                server.starttls()
            if username and password:
                server.login(username, password)
            server.send_message(msg)
        return True, None
    except Exception as exc:
        log.error("Email send failed to %s: %s", to_email, exc, exc_info=True)
        return False, str(exc)
