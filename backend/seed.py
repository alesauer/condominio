"""
Script para criar o primeiro usuário administrador e dados iniciais.
Execute: python seed.py
"""
import asyncio
from sqlalchemy import select
from app.core.database import async_session
from app.core.database import engine, Base
from app.models.usuario import Usuario
from app.models.config_inadimplencia import ConfigInadimplencia
from app.core.security import hash_password
import app.models  # noqa: F401


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        existing_admin = await db.scalar(
            select(Usuario).where(Usuario.email == "admin@condo.com")
        )
        if not existing_admin:
            admin = Usuario(
                nome="Administrador",
                email="admin@condo.com",
                senha_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)

        existing_config = await db.scalar(select(ConfigInadimplencia))
        if not existing_config:
            config = ConfigInadimplencia(
                percentual_multa=2.00,
                percentual_juros_mes=1.00,
                dias_tolerancia=5,
            )
            db.add(config)

        await db.commit()
        print("Seed base concluído!")
        print("  Email: admin@condo.com")
        print("  Senha: admin123")

    # Importar dados reais do Condomínio Monazita
    from seed_condominio_monazita import seed_monazita
    await seed_monazita()


if __name__ == "__main__":
    asyncio.run(seed())

