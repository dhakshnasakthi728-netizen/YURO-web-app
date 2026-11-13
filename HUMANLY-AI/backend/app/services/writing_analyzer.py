"""Writing quality analysis service."""
import re
from typing import Dict, Any, List
import textstat


class WritingAnalyzer:
    """Analyze writing quality."""
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """Perform comprehensive writing analysis."""
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        word_count = len(words)
        sentence_count = len(sentences)
        paragraph_count = len(paragraphs)
        
        # Readability
        try:
            flesch = textstat.flesch_reading_ease(text)
            flesch_kincaid = textstat.flesch_kincaid_grade(text)
            gunning_fog = textstat.gunning_fog(text)
        except:
            flesch = 0
            flesch_kincaid = 0
            gunning_fog = 0
        
        # Determine readability level
        if flesch >= 90:
            readability_level = "Very Easy"
        elif flesch >= 80:
            readability_level = "Easy"
        elif flesch >= 70:
            readability_level = "Fairly Easy"
        elif flesch >= 60:
            readability_level = "Standard"
        elif flesch >= 50:
            readability_level = "Fairly Difficult"
        elif flesch >= 30:
            readability_level = "Difficult"
        else:
            readability_level = "Very Difficult"
        
        avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
        avg_paragraph_length = word_count / paragraph_count if paragraph_count > 0 else 0
        
        # Find repeated phrases
        repeated_phrases = self._find_repeated_phrases(words)
        
        # Find grammar issues (basic)
        grammar_issues = self._find_basic_grammar_issues(text)
        
        # Clarity suggestions
        clarity_suggestions = []
        if avg_sentence_length > 25:
            clarity_suggestions.append("Some sentences are long. Consider breaking them into shorter ones for better readability.")
        if len(repeated_phrases) > 0:
            clarity_suggestions.append("You have repeated phrases. Try using synonyms or rephrasing to add variety.")
        if paragraph_count > 0 and avg_paragraph_length > 150:
            clarity_suggestions.append("Some paragraphs are very long. Consider breaking them up for easier reading.")
        
        return {
            "readability_score": round(flesch, 2),
            "readability_level": readability_level,
            "avg_sentence_length": round(avg_sentence_length, 2),
            "sentence_count": sentence_count,
            "word_count": word_count,
            "repeated_phrases": repeated_phrases[:5],
            "grammar_issues": grammar_issues[:5],
            "clarity_suggestions": clarity_suggestions,
            "tone_consistency": {
                "assessment": "Objective analysis based on sentence structure and word choice patterns",
                "note": "Tone assessment is subjective and should be interpreted with caution"
            },
            "paragraph_analysis": {
                "paragraph_count": paragraph_count,
                "avg_paragraph_length": round(avg_paragraph_length, 2)
            },
            "objective_metrics": {
                "flesch_reading_ease": round(flesch, 2),
                "flesch_kincaid_grade": round(flesch_kincaid, 2),
                "gunning_fog": round(gunning_fog, 2)
            },
            "subjective_assessment": {
                "note": "Subjective assessments are based on language patterns, not definitive judgments of quality or authorship"
            },
            "disclaimers": [
                "Readability scores are statistical measures, not indicators of writing quality or authorship",
                "Suggestions are recommendations, not requirements",
                "Grammar checking is basic and may miss context-dependent issues"
            ]
        }
    
    def _find_repeated_phrases(self, words: List[str], min_length: int = 3) -> List[Dict[str, Any]]:
        """Find repeated phrases."""
        phrases = []
        for length in range(min_length, min_length + 3):
            if len(words) < length * 2:
                continue
            for i in range(len(words) - length + 1):
                phrase = ' '.join(words[i:i+length])
                count = ' '.join(words).count(phrase)
                if count >= 2:
                    phrases.append({"phrase": phrase, "count": count, "length": length})
        
        # Remove duplicates and sort
        seen = set()
        unique = []
        for p in phrases:
            if p['phrase'] not in seen:
                seen.add(p['phrase'])
                unique.append(p)
        
        return sorted(unique, key=lambda x: x['count'], reverse=True)
    
    def _find_basic_grammar_issues(self, text: str) -> List[Dict[str, Any]]:
        """Find basic grammar issues."""
        issues = []
        # Double spaces
        if '  ' in text:
            issues.append({"type": "spacing", "description": "Multiple consecutive spaces found"})
        # Missing space after period (basic)
        if re.search(r'\.[A-Z]', text):
            issues.append({"type": "punctuation", "description": "Possible missing space after period"})
        # Very long sentences
        sentences = re.split(r'[.!?]+', text)
        for s in sentences:
            if len(s.split()) > 40:
                issues.append({"type": "sentence_length", "description": "Very long sentence detected"})
                break
        return issues
