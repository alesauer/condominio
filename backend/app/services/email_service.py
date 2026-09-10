import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger("condo.email")


async def send_email(
    destinatarios: List[str],
    assunto: str,
    corpo_texto: str,
    corpo_html: Optional[str] = None,
) -> bool:
    """
    Envia e-mail assíncrono utilizando o servidor SMTP configurado.
    Caso o SMTP não esteja configurado, registra em log em modo fallback.
    """
    if not destinatarios:
        return False

    if not settings.SMTP_HOST:
        logger.info(
            "[EMAIL SIMULAÇÃO] Para: %s | Assunto: %s | Corpo: %s",
            ", ".join(destinatarios),
            assunto,
            corpo_texto[:100],
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = assunto
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = ", ".join(destinatarios)

        part1 = MIMEText(corpo_texto, "plain", "utf-8")
        msg.attach(part1)

        if corpo_html:
            part2 = MIMEText(corpo_html, "html", "utf-8")
            msg.attach(part2)

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAIL_FROM, destinatarios, msg.as_string())
        server.quit()
        logger.info("E-mail enviado com sucesso para: %s", ", ".join(destinatarios))
        return True
    except Exception as e:
        logger.error("Falha ao enviar e-mail: %s", e, exc_info=True)
        return False
