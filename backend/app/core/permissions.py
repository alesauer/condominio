from fastapi import Depends, HTTPException, status
from app.models.usuario import RoleUsuario
from app.api.deps import get_current_user

class PermissionChecker:
    def __init__(self, allowed_roles: list[RoleUsuario]):
        self.allowed_roles = allowed_roles

    async def __call__(self, current_user=Depends(get_current_user)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão negada",
            )
        return current_user


admin_required = PermissionChecker([RoleUsuario.admin])
