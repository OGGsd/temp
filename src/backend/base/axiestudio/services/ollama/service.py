"""Ollama Service for managing embedded Ollama instance."""

from __future__ import annotations

import asyncio
import os
import subprocess
import time
from typing import Any, Dict, List, Optional

import httpx
from axiestudio.logging import logger
from axiestudio.services.base import Service


class OllamaService(Service):
    """Service for managing embedded Ollama instance."""
    
    name = "ollama_service"
    
    def __init__(self):
        super().__init__()
        self.host = os.getenv("OLLAMA_HOST", "127.0.0.1:11434")
        self.base_url = f"http://{self.host}"
        self.models_dir = os.getenv("OLLAMA_DATA_DIR", "/app/ollama-data")
        self.is_embedded = os.getenv("AXIESTUDIO_EMBEDDED_OLLAMA", "false").lower() == "true"
        self.process: Optional[subprocess.Popen] = None
        self._client = httpx.AsyncClient(timeout=30.0)
        
    async def initialize(self) -> None:
        """Initialize the Ollama service."""
        logger.info("Initializing Ollama service...")

        try:
            # For embedded mode, we assume Ollama is already started by the startup script
            # Just wait for it to be ready and verify default model
            if await self._wait_for_ollama():
                logger.info("✅ Ollama service is ready")
                if self.is_embedded:
                    await self._ensure_default_model()
            else:
                logger.warning("⚠️ Ollama service not available - components will use external instances")
        except Exception as e:
            logger.error(f"Failed to initialize Ollama service: {e}")
            # Don't raise - allow AxieStudio to continue without Ollama
    
    async def teardown(self) -> None:
        """Teardown the Ollama service."""
        logger.info("Shutting down Ollama service...")
        
        await self._client.aclose()
        
        if self.process and self.is_embedded:
            try:
                self.process.terminate()
                self.process.wait(timeout=10)
                logger.info("✅ Ollama process terminated")
            except subprocess.TimeoutExpired:
                logger.warning("Ollama process didn't terminate gracefully, killing...")
                self.process.kill()
                self.process.wait()
            except Exception as e:
                logger.error(f"Error terminating Ollama process: {e}")
    

    
    async def _wait_for_ollama(self, max_attempts: int = 30) -> bool:
        """Wait for Ollama to be ready."""
        logger.info("Waiting for Ollama to be ready...")
        
        for attempt in range(1, max_attempts + 1):
            if await self.is_running():
                logger.info(f"✅ Ollama ready after {attempt} attempts")
                return True
            
            logger.debug(f"Attempt {attempt}/{max_attempts} - Ollama not ready yet...")
            await asyncio.sleep(2)
        
        logger.error("❌ Ollama failed to start within timeout")
        return False
    
    async def is_running(self) -> bool:
        """Check if Ollama is running and responsive."""
        try:
            response = await self._client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except Exception:
            return False
    
    async def get_models(self) -> List[Dict[str, Any]]:
        """Get list of available models."""
        try:
            response = await self._client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            data = response.json()
            return data.get("models", [])
        except Exception as e:
            logger.error(f"Failed to get models: {e}")
            return []
    
    async def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry."""
        try:
            logger.info(f"Pulling model: {model_name}")
            
            async with self._client.stream(
                "POST",
                f"{self.base_url}/api/pull",
                json={"name": model_name}
            ) as response:
                response.raise_for_status()
                async for chunk in response.aiter_text():
                    if chunk.strip():
                        logger.debug(f"Pull progress: {chunk.strip()}")
            
            logger.info(f"✅ Successfully pulled model: {model_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to pull model {model_name}: {e}")
            return False
    
    async def delete_model(self, model_name: str) -> bool:
        """Delete a model."""
        try:
            response = await self._client.delete(
                f"{self.base_url}/api/delete",
                json={"name": model_name}
            )
            response.raise_for_status()
            logger.info(f"✅ Successfully deleted model: {model_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete model {model_name}: {e}")
            return False
    
    async def _ensure_default_model(self) -> None:
        """Ensure the default model (Gemma2 2B) is available."""
        models = await self.get_models()
        model_names = [model.get("name", "") for model in models]
        
        if not any("gemma2:2b" in name for name in model_names):
            logger.info("Default model not found, pulling Gemma2 2B...")
            await self.pull_model("gemma2:2b")
    
    async def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific model."""
        try:
            response = await self._client.post(
                f"{self.base_url}/api/show",
                json={"name": model_name}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get model info for {model_name}: {e}")
            return None
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check and return status."""
        is_running = await self.is_running()
        models = await self.get_models() if is_running else []
        
        return {
            "status": "healthy" if is_running else "unhealthy",
            "is_running": is_running,
            "is_embedded": self.is_embedded,
            "base_url": self.base_url,
            "models_count": len(models),
            "models": [model.get("name", "") for model in models],
            "process_id": self.process.pid if self.process else None
        }
