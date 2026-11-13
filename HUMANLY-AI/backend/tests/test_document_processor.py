"""Tests for document processor."""
import pytest
from app.services.document_processor import DocumentProcessor


def test_clean_text():
    """Test text cleaning."""
    processor = DocumentProcessor()
    text = "Hello   world\n\n\nTest"
    cleaned = processor.clean_text(text)
    assert cleaned == "Hello world\n\nTest"


def test_validate_text_empty():
    """Test validation with empty text."""
    processor = DocumentProcessor()
    result = processor.validate_text("")
    assert result['valid'] is False


def test_validate_text_short():
    """Test validation with short text."""
    processor = DocumentProcessor()
    result = processor.validate_text("Hello world")
    assert result['valid'] is False


def test_validate_text_valid():
    """Test validation with valid text."""
    processor = DocumentProcessor()
    text = " ".join(["word"] * 60)
    result = processor.validate_text(text)
    assert result['valid'] is True
    assert result['word_count'] == 60
