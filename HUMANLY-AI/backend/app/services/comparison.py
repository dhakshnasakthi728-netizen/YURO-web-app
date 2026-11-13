"""Text comparison service."""
import difflib
from typing import Dict, Any, List


class TextComparator:
    """Compare original and rewritten text."""
    
    def compare(self, original: str, rewritten: str) -> Dict[str, Any]:
        """Generate diff between original and rewritten."""
        # Use difflib
        differ = difflib.Differ()
        diff = list(differ.compare(original.splitlines(keepends=True), rewritten.splitlines(keepends=True)))
        
        diff_result = []
        additions = 0
        deletions = 0
        modifications = 0
        unchanged = 0
        
        for line in diff:
            if line.startswith('  '):  # unchanged
                diff_result.append({"type": "unchanged", "text": line[2:]})
                unchanged += 1
            elif line.startswith('+ '):  # addition
                diff_result.append({"type": "addition", "text": line[2:]})
                additions += 1
            elif line.startswith('- '):  # deletion
                diff_result.append({"type": "deletion", "text": line[2:]})
                deletions += 1
            elif line.startswith('? '):  # hint
                continue
        
        # Count modifications as pairs
        if additions > 0 and deletions > 0:
            modifications = min(additions, deletions)
        
        return {
            "diff": diff_result,
            "additions": additions,
            "deletions": deletions,
            "modifications": modifications,
            "unchanged": unchanged,
            "word_count_original": len(original.split()),
            "word_count_rewritten": len(rewritten.split())
        }
    
    def sentence_level_compare(self, original: str, rewritten: str) -> Dict[str, Any]:
        """Sentence-level comparison."""
        import re
        orig_sentences = re.split(r'(?<=[.!?])\s+', original)
        rew_sentences = re.split(r'(?<=[.!?])\s+', rewritten)
        
        return {
            "original_sentences": len([s for s in orig_sentences if s.strip()]),
            "rewritten_sentences": len([s for s in rew_sentences if s.strip()]),
            "original_count": len(orig_sentences),
            "rewritten_count": len(rew_sentences)
        }
