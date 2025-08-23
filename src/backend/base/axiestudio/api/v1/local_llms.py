"""API endpoints for Local LLMs management."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from axiestudio.api.utils import CurrentActiveUser
from axiestudio.services.deps import get_ollama_service, get_settings_service
from axiestudio.services.ollama.service import OllamaService
from axiestudio.services.settings.service import SettingsService

router = APIRouter(prefix="/local-llms", tags=["Local LLMs"])


class ModelInfo(BaseModel):
    """Model information response."""
    name: str
    size: Optional[int] = None
    modified_at: Optional[str] = None
    digest: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class OllamaStatus(BaseModel):
    """Ollama service status response."""
    status: str
    is_running: bool
    is_embedded: bool
    base_url: str
    models_count: int
    models: List[str]
    process_id: Optional[int] = None


class ModelPullRequest(BaseModel):
    """Request to pull a model."""
    model_name: str


class ModelDeleteRequest(BaseModel):
    """Request to delete a model."""
    model_name: str


class OllamaSettings(BaseModel):
    """Ollama settings."""
    embedded_ollama_enabled: bool
    ollama_host: str
    ollama_models_dir: str
    ollama_default_model: str
    ollama_auto_pull_models: bool


@router.get("/status", response_model=OllamaStatus)
async def get_ollama_status(
    current_user: CurrentActiveUser,
    ollama_service: OllamaService = Depends(get_ollama_service)
) -> OllamaStatus:
    """Get Ollama service status."""
    try:
        health_data = await ollama_service.health_check()
        return OllamaStatus(**health_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Ollama status: {str(e)}")


@router.get("/models", response_model=List[ModelInfo])
async def get_models(
    current_user: CurrentActiveUser,
    ollama_service: OllamaService = Depends(get_ollama_service)
) -> List[ModelInfo]:
    """Get list of available models."""
    try:
        models = await ollama_service.get_models()
        return [
            ModelInfo(
                name=model.get("name", ""),
                size=model.get("size"),
                modified_at=model.get("modified_at"),
                digest=model.get("digest"),
                details=model.get("details")
            )
            for model in models
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")


@router.post("/models/pull")
async def pull_model(
    request: ModelPullRequest,
    current_user: CurrentActiveUser,
    ollama_service: OllamaService = Depends(get_ollama_service)
) -> Dict[str, Any]:
    """Pull a model from Ollama registry."""
    try:
        success = await ollama_service.pull_model(request.model_name)
        if success:
            return {"message": f"Successfully pulled model: {request.model_name}"}
        else:
            raise HTTPException(status_code=400, detail=f"Failed to pull model: {request.model_name}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error pulling model: {str(e)}")


@router.delete("/models/{model_name}")
async def delete_model(
    model_name: str,
    current_user: CurrentActiveUser,
    ollama_service: OllamaService = Depends(get_ollama_service)
) -> Dict[str, Any]:
    """Delete a model."""
    try:
        success = await ollama_service.delete_model(model_name)
        if success:
            return {"message": f"Successfully deleted model: {model_name}"}
        else:
            raise HTTPException(status_code=400, detail=f"Failed to delete model: {model_name}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting model: {str(e)}")


@router.get("/models/{model_name}/info")
async def get_model_info(
    model_name: str,
    current_user: CurrentActiveUser,
    ollama_service: OllamaService = Depends(get_ollama_service)
) -> Dict[str, Any]:
    """Get detailed information about a specific model."""
    try:
        info = await ollama_service.get_model_info(model_name)
        if info:
            return info
        else:
            raise HTTPException(status_code=404, detail=f"Model not found: {model_name}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting model info: {str(e)}")


@router.get("/settings", response_model=OllamaSettings)
async def get_ollama_settings(
    current_user: CurrentActiveUser,
    settings_service: SettingsService = Depends(get_settings_service)
) -> OllamaSettings:
    """Get Ollama settings."""
    settings = settings_service.settings
    return OllamaSettings(
        embedded_ollama_enabled=settings.embedded_ollama_enabled,
        ollama_host=settings.ollama_host,
        ollama_models_dir=settings.ollama_models_dir,
        ollama_default_model=settings.ollama_default_model,
        ollama_auto_pull_models=settings.ollama_auto_pull_models
    )


@router.put("/settings")
async def update_ollama_settings(
    settings_update: OllamaSettings,
    current_user: CurrentActiveUser,
    settings_service: SettingsService = Depends(get_settings_service)
) -> Dict[str, Any]:
    """Update Ollama settings."""
    try:
        settings_service.settings.embedded_ollama_enabled = settings_update.embedded_ollama_enabled
        settings_service.settings.ollama_host = settings_update.ollama_host
        settings_service.settings.ollama_models_dir = settings_update.ollama_models_dir
        settings_service.settings.ollama_default_model = settings_update.ollama_default_model
        settings_service.settings.ollama_auto_pull_models = settings_update.ollama_auto_pull_models
        
        return {"message": "Ollama settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")


@router.get("/recommended-models")
async def get_recommended_models(
    current_user: CurrentActiveUser
) -> List[Dict[str, Any]]:
    """Get list of recommended models for different use cases."""
    recommended_models = [
        {
            "name": "gemma2:2b",
            "size": "1.6GB",
            "description": "Google's efficient 2B parameter model - excellent for general tasks",
            "use_case": "General purpose, fast responses",
            "recommended": True
        },
        {
            "name": "llama3.2:3b",
            "size": "2.0GB", 
            "description": "Meta's latest 3B model with good reasoning capabilities",
            "use_case": "Balanced performance and quality",
            "recommended": True
        },
        {
            "name": "phi3:mini",
            "size": "2.3GB",
            "description": "Microsoft's compact model optimized for reasoning",
            "use_case": "Code generation and reasoning",
            "recommended": False
        },
        {
            "name": "qwen2.5:3b",
            "size": "2.0GB",
            "description": "Alibaba's multilingual model with strong performance",
            "use_case": "Multilingual tasks",
            "recommended": False
        },
        {
            "name": "tinyllama:1.1b",
            "size": "0.7GB",
            "description": "Ultra-lightweight model for resource-constrained environments",
            "use_case": "Minimal resource usage",
            "recommended": False
        }
    ]
    
    return recommended_models
