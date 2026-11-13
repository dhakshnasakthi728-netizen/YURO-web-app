"""Text humanization service."""
import re
import json
from typing import Dict, Any, List, Optional
import httpx
from ..core.config import settings


class Humanizer:
    """Text humanization service."""
    
    MODES = {
        "natural_conversational": "Rewrite in a natural, conversational tone as if speaking to a friend. Use contractions where appropriate, varied sentence structure.",
        "academic_clear": "Rewrite in clear academic style. Maintain precision, use proper terminology, ensure logical flow.",
        "professional": "Rewrite in a polished, professional tone suitable for business communication.",
        "simple_english": "Rewrite using simple, clear English. Use common words, shorter sentences where helpful.",
        "concise": "Rewrite to be more concise and direct. Remove redundancy while preserving meaning.",
        "detailed_explanation": "Rewrite to provide clearer explanations with better structure and transitions.",
        "personal_voice": "Rewrite to sound more personal and authentic while maintaining the core message.",
        "grammar_clarity": "Focus primarily on grammar, clarity, and readability improvements."
    }
    
    def __init__(self):
        self.provider = str(settings.HUMANIZATION_PROVIDER).strip().lower()
    
    async def humanize_text(
        self, 
        text: str, 
        mode: str, 
        preserve_voice_sample: Optional[str] = None,
        check_facts: bool = True
    ) -> Dict[str, Any]:
        """Humanize text using configured provider."""
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        if mode not in self.MODES:
            raise ValueError(f"Invalid mode: {mode}")
        
        original_word_count = len(text.split())
        
        # Try to use provider
        rewritten_text = None
        provider_used = "none"
        warnings = []
        
        provider = str(getattr(settings, 'HUMANIZATION_PROVIDER', '') or getattr(self, 'provider', '') or '').strip().lower()
        if provider == 'ollama':
            rewritten_text, provider_used, warnings = await self._humanize_with_ollama(text, mode, preserve_voice_sample)
        elif provider == 'openai' and getattr(settings, 'OPENAI_API_KEY', None):
            rewritten_text, provider_used, warnings = await self._humanize_with_openai(text, mode, preserve_voice_sample)
        elif provider == 'anthropic' and getattr(settings, 'ANTHROPIC_API_KEY', None):
            rewritten_text, provider_used, warnings = await self._humanize_with_anthropic(text, mode, preserve_voice_sample)
        else:
            # No provider configured - cannot simulate
            raise Exception(
                f"No humanization provider configured or available. "
                f"Resolved provider: '{provider or 'none'}'. "
                f"Configure HUMANIZATION_PROVIDER=ollama and ensure Ollama is running with the selected model."
            )
        
        if not rewritten_text:
            raise Exception("Humanization failed - no output generated")
        
        rewritten_word_count = len(rewritten_text.split())
        
        # Perform verification
        preservation_check = await self._verify_preservation(text, rewritten_text)
        verification_passed = preservation_check.get('passed', False)
        
        if not verification_passed:
            warnings.append("Verification found potential issues with preservation of facts/numbers/citations")
        
        # Generate change tracking (simplified)
        changes = self._track_changes(text, rewritten_text)
        
        return {
            "original_text": text,
            "rewritten_text": rewritten_text,
            "mode": mode,
            "changes": changes,
            "word_count_original": original_word_count,
            "word_count_rewritten": rewritten_word_count,
            "preservation_check": preservation_check,
            "verification_passed": verification_passed,
            "warnings": warnings,
            "provider_used": provider_used
        }
    
    async def _humanize_with_ollama(self, text: str, mode: str, voice_sample: Optional[str]) -> tuple:
        """Humanize using Ollama."""
        try:
            prompt = self._build_prompt(text, mode, voice_sample)
            # Keep prompts compact for small local models
            if len(prompt) > 1800:
                mode_instruction = self.MODES.get(mode, "Rewrite naturally.")
                sample = ""
                if voice_sample:
                    sample = f"\nStyle sample (match tone only): {voice_sample[:200]}\n"
                prompt = (
                    f"Task: Rewrite the text below. {mode_instruction}\n"
                    f"Rules: Preserve all meaning, names, dates, numbers, citations, and URLs exactly. "
                    f"Do not add information. Return only the rewritten text.{sample}\n"
                    f"Text:\n{text[:1200]}\n\nRewritten text:"
                )

            timeout = min(settings.OLLAMA_TIMEOUT, 120)
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Check if model exists
                try:
                    tags_response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=3)
                    if tags_response.status_code == 200:
                        tags = tags_response.json()
                        model_names = [m.get('name', '') for m in tags.get('models', [])]
                        model_found = settings.OLLAMA_MODEL in model_names
                        if not model_found and model_names:
                            # Try without tag
                            base = settings.OLLAMA_MODEL.split(':')[0]
                            model_found = any(m.startswith(base + ':') for m in model_names)
                        if not model_found:
                            raise Exception(f"Model '{settings.OLLAMA_MODEL}' not found. Available: {', '.join(model_names) or 'none'}. Run: ollama pull {settings.OLLAMA_MODEL}")
                except httpx.ConnectError:
                    raise Exception("Cannot connect to Ollama at http://localhost:11434. Is Ollama running?")

                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": settings.OLLAMA_MODEL,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.4,
                            "num_predict": min(max(128, len(text.split()) * 2), 512),
                            "top_p": 0.9,
                        }
                    }
                )
                response.raise_for_status()
                result = response.json()
                rewritten = result.get('response', '').strip()

                if not rewritten:
                    return None, "ollama", ["Empty response from Ollama"]

                # Guard against meta-responses from small models
                lowered = rewritten.lower()
                if "please provide the text" in lowered or "i'm ready to help" in lowered or "i am ready to help" in lowered:
                    return None, f"ollama:{settings.OLLAMA_MODEL}", ["Model returned a non-rewrite response; try again or use a longer input."]

                return rewritten, f"ollama:{settings.OLLAMA_MODEL}", []
        except httpx.ConnectError:
            raise Exception("Cannot connect to Ollama at http://localhost:11434. Start Ollama and ensure model is available.")
        except httpx.TimeoutException:
            raise Exception(f"Request timed out. Model {settings.OLLAMA_MODEL} may be loading or too slow for this hardware.")
        except Exception as e:
            if "not found" in str(e).lower():
                raise
            raise Exception(f"Ollama humanization failed: {str(e)}")
    
    async def _humanize_with_openai(self, text: str, mode: str, voice_sample: Optional[str]) -> tuple:
        """Humanize using OpenAI."""
        try:
            prompt = self._build_prompt(text, mode, voice_sample)
            
            async with httpx.AsyncClient(timeout=300) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.OPENAI_MODEL,
                        "messages": [
                            {"role": "system", "content": "You are an expert editor that rewrites text to be more natural while preserving meaning exactly. Never invent facts, numbers, or citations."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": settings.HUMANIZATION_TEMPERATURE,
                        "max_tokens": settings.HUMANIZATION_MAX_TOKENS
                    }
                )
                response.raise_for_status()
                result = response.json()
                rewritten = result['choices'][0]['message']['content'].strip()
                return rewritten, "openai", []
        except Exception as e:
            raise Exception(f"OpenAI humanization failed: {str(e)}")
    
    async def _humanize_with_anthropic(self, text: str, mode: str, voice_sample: Optional[str]) -> tuple:
        """Humanize using Anthropic."""
        raise Exception("Anthropic provider not implemented yet")
    
    def _build_prompt(self, text: str, mode: str, voice_sample: Optional[str]) -> str:
        """Build humanization prompt."""
        mode_instruction = self.MODES[mode]
        
        prompt = f"""You are rewriting text to make it sound more natural and human-written while preserving ALL meaning exactly.

Mode: {mode_instruction}

CRITICAL RULES:
- Preserve ALL original claims, facts, and arguments
- Preserve ALL technical terminology exactly as appropriate
- Preserve ALL names, dates, numbers, measurements, and statistics EXACTLY
- Preserve ALL citations, references, quotes, and URLs
- Preserve ALL legal/technical qualifications and limitations
- DO NOT invent any new information, sources, or examples
- DO NOT change numerical values
- If uncertain about meaning, keep original phrasing
- Improve flow and readability only
- Vary sentence structure naturally
- Remove awkward phrasing and unnecessary repetition

Text to rewrite:
{text}
"""
        
        if voice_sample:
            prompt += f"\n\nMatch the writing style of this sample (vocabulary, tone, rhythm):\n{voice_sample[:500]}\n"
        
        prompt += "\n\nReturn ONLY the rewritten text with no explanations or comments."
        
        return prompt
    
    async def _verify_preservation(self, original: str, rewritten: str) -> Dict[str, Any]:
        """Verify important elements are preserved."""
        issues = []
        
        # Check numbers
        orig_numbers = re.findall(r'\b\d+(?:[.,]\d+)?\b', original)
        rew_numbers = re.findall(r'\b\d+(?:[.,]\d+)?\b', rewritten)
        if set(orig_numbers) != set(rew_numbers):
            issues.append("Number mismatch detected")
        
        # Check citations [1], (Smith, 2020), etc.
        orig_citations = re.findall(r'\[\d+\]|\([A-Z][a-z]+(?:\s+et\s+al\.)?,?\s+\d{4}\)', original)
        rew_citations = re.findall(r'\[\d+\]|\([A-Z][a-z]+(?:\s+et\s+al\.)?,?\s+\d{4}\)', rewritten)
        if len(orig_citations) != len(rew_citations):
            issues.append("Citation count mismatch")
        
        # Check URLs
        orig_urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', original)
        rew_urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', rewritten)
        if set(orig_urls) != set(rew_urls):
            issues.append("URL mismatch")
        
        return {
            "passed": len(issues) == 0,
            "issues": issues,
            "numbers_preserved": set(orig_numbers) == set(rew_numbers),
            "citations_preserved": len(orig_citations) == len(rew_citations),
            "urls_preserved": set(orig_urls) == set(rew_urls)
        }
    
    def _track_changes(self, original: str, rewritten: str) -> List[Dict[str, Any]]:
        """Track changes (simplified)."""
        changes = []
        # This is a simplified version
        if original != rewritten:
            changes.append({
                "original": original[:100] + "..." if len(original) > 100 else original,
                "rewritten": rewritten[:100] + "..." if len(rewritten) > 100 else rewritten,
                "change_type": "restructured",
                "reason": "Improved flow and readability",
                "confidence": 0.8
            })
        return changes
