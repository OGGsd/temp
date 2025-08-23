#!/usr/bin/env python3
"""
Test script for embedded Ollama functionality in AxieStudio.
This script validates that the embedded Ollama integration works correctly.
"""

import asyncio
import json
import os
import sys
import time
from typing import Dict, Any

import httpx


class OllamaTestSuite:
    """Test suite for embedded Ollama functionality."""
    
    def __init__(self, base_url: str = "http://localhost:7860"):
        self.base_url = base_url
        self.ollama_url = "http://127.0.0.1:11434"
        self.client = httpx.AsyncClient(timeout=30.0)
        self.results = []
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def log_test(self, test_name: str, success: bool, message: str = "", details: Dict[str, Any] = None):
        """Log test result."""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"    {message}")
        if details:
            print(f"    Details: {json.dumps(details, indent=2)}")
        
        self.results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {}
        })
    
    async def test_axiestudio_health(self):
        """Test AxieStudio health endpoint."""
        try:
            response = await self.client.get(f"{self.base_url}/health_check")
            success = response.status_code == 200
            self.log_test(
                "AxieStudio Health Check",
                success,
                f"Status: {response.status_code}",
                {"response": response.text[:200] if not success else "OK"}
            )
            return success
        except Exception as e:
            self.log_test("AxieStudio Health Check", False, f"Error: {e}")
            return False
    
    async def test_ollama_direct_access(self):
        """Test direct access to embedded Ollama."""
        try:
            response = await self.client.get(f"{self.ollama_url}/api/tags")
            success = response.status_code == 200
            data = response.json() if success else {}
            models = data.get("models", [])
            
            self.log_test(
                "Ollama Direct Access",
                success,
                f"Found {len(models)} models" if success else f"Status: {response.status_code}",
                {"models": [m.get("name", "") for m in models]} if success else {"error": response.text[:200]}
            )
            return success, models
        except Exception as e:
            self.log_test("Ollama Direct Access", False, f"Error: {e}")
            return False, []
    
    async def test_ollama_api_status(self):
        """Test AxieStudio Ollama API status endpoint."""
        try:
            response = await self.client.get(f"{self.base_url}/api/v1/local-llms/status")
            success = response.status_code == 200
            data = response.json() if success else {}
            
            self.log_test(
                "Ollama API Status",
                success,
                f"Ollama running: {data.get('is_running', False)}, Embedded: {data.get('is_embedded', False)}" if success else f"Status: {response.status_code}",
                data if success else {"error": response.text[:200]}
            )
            return success, data
        except Exception as e:
            self.log_test("Ollama API Status", False, f"Error: {e}")
            return False, {}
    
    async def test_ollama_api_models(self):
        """Test AxieStudio Ollama API models endpoint."""
        try:
            response = await self.client.get(f"{self.base_url}/api/v1/local-llms/models")
            success = response.status_code == 200
            data = response.json() if success else []
            
            self.log_test(
                "Ollama API Models",
                success,
                f"Found {len(data)} models" if success else f"Status: {response.status_code}",
                {"models": [m.get("name", "") for m in data]} if success else {"error": response.text[:200]}
            )
            return success, data
        except Exception as e:
            self.log_test("Ollama API Models", False, f"Error: {e}")
            return False, []
    
    async def test_gemma2_model_availability(self):
        """Test if Gemma2 2B model is available."""
        try:
            _, models = await self.test_ollama_api_models()
            gemma_models = [m for m in models if "gemma2" in m.get("name", "").lower()]
            success = len(gemma_models) > 0
            
            self.log_test(
                "Gemma2 Model Availability",
                success,
                f"Found Gemma2 models: {[m.get('name') for m in gemma_models]}" if success else "No Gemma2 models found",
                {"gemma_models": gemma_models}
            )
            return success
        except Exception as e:
            self.log_test("Gemma2 Model Availability", False, f"Error: {e}")
            return False
    
    async def test_recommended_models_endpoint(self):
        """Test recommended models endpoint."""
        try:
            response = await self.client.get(f"{self.base_url}/api/v1/local-llms/recommended-models")
            success = response.status_code == 200
            data = response.json() if success else []
            
            recommended_count = len([m for m in data if m.get("recommended", False)])
            
            self.log_test(
                "Recommended Models Endpoint",
                success,
                f"Found {len(data)} models, {recommended_count} recommended" if success else f"Status: {response.status_code}",
                {"total_models": len(data), "recommended": recommended_count} if success else {"error": response.text[:200]}
            )
            return success
        except Exception as e:
            self.log_test("Recommended Models Endpoint", False, f"Error: {e}")
            return False
    
    async def test_ollama_component_auto_detection(self):
        """Test if Ollama components can auto-detect embedded instance."""
        # This would require creating a flow and testing component behavior
        # For now, we'll just check if the environment variables are set correctly
        try:
            embedded_enabled = os.getenv("AXIESTUDIO_EMBEDDED_OLLAMA", "false").lower() == "true"
            ollama_host = os.getenv("OLLAMA_HOST", "")
            
            success = embedded_enabled and ollama_host
            self.log_test(
                "Ollama Component Auto-Detection Setup",
                success,
                f"Embedded: {embedded_enabled}, Host: {ollama_host}" if success else "Environment not configured",
                {"embedded_enabled": embedded_enabled, "ollama_host": ollama_host}
            )
            return success
        except Exception as e:
            self.log_test("Ollama Component Auto-Detection Setup", False, f"Error: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all tests in sequence."""
        print("🚀 Starting AxieStudio Embedded Ollama Test Suite")
        print("=" * 60)
        
        # Wait for services to be ready
        print("⏳ Waiting for services to be ready...")
        await asyncio.sleep(10)
        
        # Test AxieStudio health first
        if not await self.test_axiestudio_health():
            print("❌ AxieStudio is not healthy, skipping remaining tests")
            return False
        
        # Run all tests
        tests = [
            self.test_ollama_direct_access,
            self.test_ollama_api_status,
            self.test_ollama_api_models,
            self.test_gemma2_model_availability,
            self.test_recommended_models_endpoint,
            self.test_ollama_component_auto_detection,
        ]
        
        for test in tests:
            await test()
            await asyncio.sleep(1)  # Small delay between tests
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("\n🎉 All tests passed! Embedded Ollama is working correctly.")
            return True
        else:
            print(f"\n⚠️ {total - passed} tests failed. Check the logs above for details.")
            return False


async def main():
    """Main test function."""
    base_url = os.getenv("AXIESTUDIO_URL", "http://localhost:7860")
    
    print(f"Testing AxieStudio at: {base_url}")
    print(f"Testing Ollama at: http://127.0.0.1:11434")
    
    async with OllamaTestSuite(base_url) as test_suite:
        success = await test_suite.run_all_tests()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
