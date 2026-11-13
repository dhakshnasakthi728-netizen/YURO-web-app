"""Tests for comparison service."""
import pytest
from app.services.comparison import TextComparator


def test_compare_identical():
    """Test comparing identical texts."""
    comparator = TextComparator()
    text = "Hello world.\n\nThis is a test."
    result = comparator.compare(text, text)
    assert result['additions'] == 0
    assert result['deletions'] == 0


def test_compare_different():
    """Test comparing different texts."""
    comparator = TextComparator()
    original = "Hello world"
    rewritten = "Hello there world"
    result = comparator.compare(original, rewritten)
    assert len(result['diff']) > 0
