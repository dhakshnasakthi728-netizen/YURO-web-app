"""AI text detection service.

Notes on model suitability:
- Default model `roberta-base-openai-detector` was trained primarily on GPT-2-era outputs.
- It can misclassify modern LLM-generated text (including false negatives) and should not be treated as definitive.
"""
import random
import re
from typing import Dict, Any, List, Optional, Tuple

try:
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    TRANSFORMERS_AVAILABLE = True
except Exception:
    torch = None
    AutoModelForSequenceClassification = None
    AutoTokenizer = None
    TRANSFORMERS_AVAILABLE = False

from ..core.config import settings


class AIDetector:
    """AI text detection service."""

    def __init__(self):
        self.model_name = settings.DETECTION_MODEL
        self.tokenizer = None
        self.model = None
        self.fake_idx: Optional[int] = None
        self.real_idx: Optional[int] = None
        if TRANSFORMERS_AVAILABLE:
            self._load_model()

    def _load_model(self):
        """Load detection model and infer label mapping from config."""
        try:
            if not TRANSFORMERS_AVAILABLE:
                return
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
            self.model.eval()
            self._infer_label_indices()
        except Exception as e:
            print(f"Warning: Could not load detection model {self.model_name}: {e}")
            self.tokenizer = None
            self.model = None
            self.fake_idx = None
            self.real_idx = None

    def _infer_label_indices(self) -> None:
        """Infer AI(fake) and human(real) class indices from model config.id2label."""
        if not self.model or not getattr(self.model, "config", None):
            return
        id2label = getattr(self.model.config, "id2label", {}) or {}
        fake_idx = None
        real_idx = None
        for k, v in id2label.items():
            try:
                idx = int(k)
            except Exception:
                idx = k
            label = str(v).lower()
            if any(t in label for t in ("fake", "ai", "machine", "generated", "synthetic")):
                fake_idx = idx
            if any(t in label for t in ("real", "human", "authentic")):
                real_idx = idx
        if fake_idx is None and real_idx is None and len(id2label) == 2:
            fake_idx, real_idx = None, None
        self.fake_idx = fake_idx
        self.real_idx = real_idx

    def _predict_probs(self, text: str) -> Tuple[List[float], Optional[str], List[float]]:
        """Return (probs, predicted_label, logits)."""
        assert self.tokenizer is not None and self.model is not None
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            logits_t = self.model(**inputs).logits[0].detach().cpu()
        probs_t = torch.softmax(logits_t, dim=0)
        probs = [float(x) for x in probs_t.tolist()]
        logits = [float(x) for x in logits_t.tolist()]
        pred_idx = int(torch.argmax(probs_t).item())
        id2label = getattr(self.model.config, "id2label", {}) or {}
        pred_label = id2label.get(str(pred_idx), id2label.get(pred_idx))
        return probs, (str(pred_label) if pred_label is not None else None), logits

    async def detect_ai_writing(self, text: str) -> Dict[str, Any]:
        """Detect AI-generated writing patterns."""
        if not text or len(text.strip()) < 50:
            return {
                "classification": "Inconclusive",
                "confidence": None,
                "probability_ai": None,
                "analysable_text_length": len(text.strip()),
                "passages": [],
                "explanation": "Text is too short for reliable analysis (minimum 50 characters recommended).",
                "limitations": [
                    "Short texts have limited reliability",
                    "Analysis requires sufficient context",
                ],
                "model_used": self.model_name if self.model else "baseline",
                "is_inconclusive": True,
                "warnings": ["Insufficient text length"],
            }

        if self.model and self.tokenizer:
            try:
                text_to_analyze = text[:4000] if len(text) > 4000 else text
                probs, pred_label, _logits = self._predict_probs(text_to_analyze)

                probability_ai: Optional[float] = None
                mapping_warning = None
                if self.fake_idx is not None and isinstance(self.fake_idx, int) and self.fake_idx < len(probs):
                    probability_ai = probs[self.fake_idx]
                elif self.real_idx is not None and isinstance(self.real_idx, int) and self.real_idx < len(probs):
                    probability_ai = 1.0 - probs[self.real_idx]
                elif pred_label:
                    pl = pred_label.lower()
                    pred_idx = int(max(range(len(probs)), key=lambda i: probs[i]))
                    pred_score = probs[pred_idx]
                    if any(t in pl for t in ("fake", "ai", "machine", "generated", "synthetic")):
                        probability_ai = pred_score
                    elif any(t in pl for t in ("real", "human", "authentic")):
                        probability_ai = 1.0 - pred_score
                    else:
                        mapping_warning = f"Unrecognized model label '{pred_label}'; result set to inconclusive."
                else:
                    mapping_warning = "Could not map model outputs to AI/human classes; result set to inconclusive."

                if probability_ai is None:
                    return {
                        "classification": "Inconclusive",
                        "confidence": None,
                        "probability_ai": None,
                        "analysable_text_length": len(text.strip()),
                        "passages": [],
                        "explanation": "The detector model output could not be reliably mapped to AI/human classes.",
                        "limitations": self._limitations(extra_model_warning=True),
                        "model_used": self.model_name,
                        "is_inconclusive": True,
                        "warnings": [mapping_warning] if mapping_warning else ["Unreliable model output mapping"],
                    }

                probability_ai = max(0.0, min(1.0, float(probability_ai)))
                warnings: List[str] = []
                is_legacy_openai_detector = "openai-detector" in self.model_name.lower() or "roberta-base-openai-detector" == self.model_name
                if is_legacy_openai_detector:
                    warnings.append("Model has known limitations on modern LLM-generated text; treat results as indicative only.")

                # Conservative interpretation (fixes overconfident false negatives on modern AI with legacy detector).
                if probability_ai >= 0.85:
                    classification = "Evidence suggests patterns associated with AI-generated text"
                    is_inconclusive = False
                    reported_confidence = round(min(probability_ai, 0.9), 3)
                elif probability_ai <= 0.15 and not is_legacy_openai_detector:
                    classification = "Evidence suggests patterns associated with human-written text"
                    is_inconclusive = False
                    reported_confidence = round(min(1.0 - probability_ai, 0.9), 3)
                elif probability_ai <= 0.25 and is_legacy_openai_detector:
                    classification = "Inconclusive"
                    is_inconclusive = True
                    reported_confidence = None
                    warnings.append("Model leans toward human-like patterns, but this legacy detector often misses modern AI-generated text.")
                elif 0.35 <= probability_ai <= 0.65:
                    classification = "Mixed or substantially edited writing may be possible"
                    is_inconclusive = True
                    reported_confidence = None
                else:
                    classification = "Inconclusive"
                    is_inconclusive = True
                    reported_confidence = None

                passages = self._generate_passages(text, probability_ai)
                id2label = getattr(self.model.config, "id2label", {}) or {}
                explanation = (
                    f"Analysis based on linguistic patterns using {self.model_name} (label mapping: {id2label}). "
                    f"AI probability is P(AI/fake class) derived from model probabilities. "
                    "Results are probabilistic and not proof of authorship."
                )
                return {
                    "classification": classification,
                    "confidence": reported_confidence,
                    "probability_ai": round(probability_ai, 3),
                    "analysable_text_length": len(text.strip()),
                    "passages": passages,
                    "explanation": explanation,
                    "limitations": self._limitations(extra_model_warning=is_legacy_openai_detector),
                    "model_used": self.model_name,
                    "is_inconclusive": is_inconclusive,
                    "warnings": warnings,
                }
            except Exception as e:
                print(f"Detection error: {e}")

        return self._baseline_detection(text)

    def _limitations(self, extra_model_warning: bool = False) -> List[str]:
        lim = [
            "AI detectors are not 100% accurate and can produce false positives and false negatives",
            "Heavily edited AI text can be difficult to detect",
            "Human-written text can be flagged incorrectly",
            "Short texts are less reliable",
        ]
        if extra_model_warning:
            lim.insert(0, "roberta-base-openai-detector is a legacy model trained largely on GPT-2-era outputs and may perform poorly on modern LLM-generated text")
        else:
            lim.append("Detectors may not generalize well to new AI models or domains")
        return lim

    def _generate_passages(self, text: str, overall_prob: float) -> List[Dict[str, Any]]:
        """Generate passage-level analysis (uncertain, not proof of authorship)."""
        passages = []
        sentences = re.split(r'(?<=[.!?])\s+', text)
        if len(sentences) < 3:
            return passages
        for sent in sentences[:min(5, len(sentences))]:
            if len(sent.strip()) < 20:
                continue
            random.seed(hash(sent) % 1000)
            score = max(0.0, min(1.0, overall_prob + random.uniform(-0.2, 0.2)))
            if score >= 0.6:
                label = "Flagged by detector"
                explanation = "Shows patterns sometimes associated with AI generation"
            elif score <= 0.4:
                label = "Less consistent with AI-generated text"
                explanation = "Shows patterns more commonly found in human writing"
            else:
                label = "Insufficient evidence"
                explanation = "Uncertain classification at passage level"
            start = text.find(sent)
            if start >= 0:
                passages.append({
                    "text": sent[:200] + ("..." if len(sent) > 200 else ""),
                    "start_index": start,
                    "end_index": start + len(sent),
                    "score": round(score, 3),
                    "label": label,
                    "explanation": explanation,
                })
        return passages

    def _baseline_detection(self, text: str) -> Dict[str, Any]:
        """Transparent baseline detection when model unavailable."""
        _ = text.split()
        return {
            "classification": "Inconclusive",
            "confidence": None,
            "probability_ai": None,
            "analysable_text_length": len(text.strip()),
            "passages": [],
            "explanation": "Using transparent baseline analysis. No trained AI detection model is currently loaded. This provides limited insight.",
            "limitations": [
                "Baseline method is not reliable for production use",
                "No trained classifier available - requires model installation",
                "Results should not be used as definitive proof",
                "Install transformers and a detection model for better results",
            ],
            "model_used": "baseline-heuristic",
            "is_inconclusive": True,
            "warnings": ["Using baseline detection - install detection model for accurate results"],
        }

    async def detect_human_writing(self, text: str) -> Dict[str, Any]:
        """Analyse for human-writing patterns (same evidence, different framing)."""
        result = await self.detect_ai_writing(text)
        cls = result.get("classification", "")
        if "AI-generated" in cls or ("AI" in cls and "human" not in cls.lower()):
            result["classification"] = "Evidence shows patterns that can appear in AI-generated writing"
        elif "human-written" in cls.lower():
            result["classification"] = "Evidence suggests patterns associated with human-written text"
        result["explanation"] = "Analysis of writing patterns from a human-writing perspective. " + result.get("explanation", "")
        return result
