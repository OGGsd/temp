"""Factory for Ollama Service."""

from axiestudio.services.factory import ServiceFactory
from axiestudio.services.ollama.service import OllamaService


class OllamaServiceFactory(ServiceFactory):
    """Factory for creating OllamaService instances."""
    
    def __init__(self):
        super().__init__(OllamaService)
    
    def create(self):
        """Create and return an OllamaService instance."""
        return OllamaService()
