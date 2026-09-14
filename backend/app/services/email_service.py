import smtplib
import logging
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("condo.email")


async def send_email(
    destinatarios: List[str],
    assunto: str,
    corpo_texto: str,
    corpo_html: Optional[str] = None,
    anexos: Optional[List[Dict[str, Any]]] = None,
) -> bool:
    """
    Envia e-mail assíncrono utilizando o servidor SMTP configurado com suporte a anexos (PDFs, etc).
    Caso o SMTP não esteja configurado, registra em log em modo simulação.
    """
    if not destinatarios:
        return False

    try:
        # Se houver anexos, usa multipart/mixed com sub-parte alternative para texto/html
        if anexos:
            msg = MIMEMultipart("mixed")
            alt_part = MIMEMultipart("alternative")
            alt_part.attach(MIMEText(corpo_texto, "plain", "utf-8"))
            if corpo_html:
                alt_part.attach(MIMEText(corpo_html, "html", "utf-8"))
            msg.attach(alt_part)

            for anexo in anexos:
                filename = anexo.get("filename", "anexo.pdf")
                content = anexo.get("content")
                if isinstance(content, str):
                    try:
                        content_bytes = base64.b64decode(content)
                    except Exception:
                        content_bytes = content.encode("utf-8")
                elif isinstance(content, bytes):
                    content_bytes = content
                else:
                    content_bytes = b""

                part = MIMEApplication(content_bytes, Name=filename)
                part["Content-Disposition"] = f'attachment; filename="{filename}"'
                msg.attach(part)
        else:
            msg = MIMEMultipart("alternative")
            msg.attach(MIMEText(corpo_texto, "plain", "utf-8"))
            if corpo_html:
                msg.attach(MIMEText(corpo_html, "html", "utf-8"))

        msg["Subject"] = assunto
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = ", ".join(destinatarios)

        if not settings.SMTP_HOST:
            logger.info(
                "[EMAIL SIMULAÇÃO] Para: %s | Assunto: %s | Anexos: %s | Corpo: %s",
                ", ".join(destinatarios),
                assunto,
                [a.get("filename") for a in (anexos or [])],
                corpo_texto[:100],
            )
            return True

        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            smtp_pwd = settings.SMTP_PASSWORD.replace(" ", "").strip()
            server.login(settings.SMTP_USER, smtp_pwd)


        server.sendmail(settings.EMAIL_FROM, destinatarios, msg.as_string())
        server.quit()
        logger.info("E-mail enviado com sucesso para: %s", ", ".join(destinatarios))
        return True
    except TimeoutError:
        err_msg = f"Tempo limite esgotado ao conectar ao SMTP ({settings.SMTP_HOST}:{settings.SMTP_PORT}). A porta 587/465 pode estar bloqueada pelo firewall da sua rede."
        logger.error("Falha ao enviar e-mail: %s", err_msg)
        raise RuntimeError(err_msg)
    except smtplib.SMTPAuthenticationError as e:
        err_msg = "Falha de autenticação no Gmail. O Google exige uma 'Senha de App' de 16 caracteres (myaccount.google.com/apppasswords) em vez da senha comum."
        logger.error("Falha ao enviar e-mail: %s (%s)", err_msg, e)
        raise RuntimeError(err_msg)
    except Exception as e:
        logger.error("Falha ao enviar e-mail: %s", e, exc_info=True)
        raise RuntimeError(f"Erro no servidor SMTP: {str(e)}")

