from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.adapters.aws_cognito import get_cognito_adapter
from app.core.dependencies import get_current_user

router = APIRouter(tags=["Amazon Cognito Auth & RBAC"])

class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = "COMMANDER"

@router.post("/auth/login", status_code=status.HTTP_200_OK)
@router.post("/api/v1/auth/login", status_code=status.HTTP_200_OK)
async def cognito_login(req: LoginRequest):
    """
    Amazon Cognito Login Endpoint:
    Validates user credentials against Amazon Cognito User Pool.
    Returns Access Token, ID Token, and User RBAC Role (COMMANDER, FIELD_OFFICER, DISPATCHER, ADMIN).
    """
    if not req.username or not req.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation Error: 'username' and 'password' are required."
        )

    adapter = get_cognito_adapter()
    result = adapter.authenticate_user(
        username=req.username,
        password=req.password,
        requested_role=req.role
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication Failed: Invalid username or password."
        )

    return {
        "status": "AUTHENTICATED",
        "access_token": result.get("access_token"),
        "id_token": result.get("id_token"),
        "user": {
            "username": result.get("username"),
            "role": result.get("role"),
            "auth_provider": result.get("auth_provider"),
            "cognito_confirmed": result.get("cognito_confirmed", False)
        }
    }

@router.get("/auth/me", status_code=status.HTTP_200_OK)
@router.get("/api/v1/auth/me", status_code=status.HTTP_200_OK)
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieves current authenticated session details verified via Cognito token.
    """
    return {
        "authenticated": True,
        "user": current_user
    }
