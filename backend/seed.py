"""
Script para criar o primeiro usuário administrador e dados iniciais.
Execute: python seed.py
"""
import asyncio
from app.core.database import async_session
from app.models.usuario import Usuario
from app.models.config_inadimplencia import ConfigInadimplencia
from app.core.security import hash_password


async def seed():
    async with async_session() as db:
        # Criar usuário admin
        admin = Usuario(
            nome="Administrador",
            email="admin@condo.com",
            senha_hash=hash_password("admin123"),
            role="admin",
        )
        db.add(admin)

        # Criar configuração de inadimplência padrão
        config = ConfigInadimplencia(
            percentual_multa=2.00,
            percentual_juros_mes=1.00,
            dias_tolerancia=5,
        )
        db.add(config)

        await db.commit()
        print("Seed concluído!")
        print("  Email: admin@condo.com")
        print("  Senha: admin123")


if __name__ == "__main__":
    asyncio.run(seed())
