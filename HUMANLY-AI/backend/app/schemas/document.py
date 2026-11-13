"""Document schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class DocumentUploadResponse(BaseModel):
    """Response for document upload."""
    job_id: str
    filename: str
    file_size: int
    file_type: str
    status: str
    message: str


class TextExtractionRequest(BaseModel):
    """Request for text extraction."""
    job_id: str


class TextExtractionResponse(BaseModel):
    """Response for text extraction."""
    job_id: str
    text: str
    page_count: Optional[int] = None
    word_count: int
    char_count: int
    extraction_method: str
    warnings: List[str] = []
    metadata: Dict[str, Any] = {}


class DetectionRequest(BaseModel):
    """Request for AI detection."""
    text: str = Field(..., min_length=10)
    mode: str = Field(..., pattern="^(ai|human)$")  # ai or human analysis


class DetectionPassage(BaseModel):
    """Passage-level detection result."""
    text: str
    start_index: int
    end_index: int
    score: float
    label: str
    explanation: str


class DetectionResponse(BaseModel):
    """Response for AI detection."""
    classification: str  # Evidence supports AI-generated, Evidence supports human-written, Mixed or substantially edited, Inconclusive
    confidence: Optional[float] = None
    probability_ai: Optional[float] = None
    analysable_text_length: int
    passages: List[DetectionPassage] = []
    explanation: str
    limitations: List[str]
    model_used: str
    is_inconclusive: bool
    warnings: List[str] = []


class HumanizationRequest(BaseModel):
    """Request for text humanization."""
    text: str = Field(..., min_length=1)
    mode: str = Field(..., pattern="^(natural_conversational|academic_clear|professional|simple_english|concise|detailed_explanation|personal_voice|grammar_clarity)$")
    preserve_voice_sample: Optional[str] = None
    check_facts: bool = True


class HumanizationChange(BaseModel):
    """Individual change in humanization."""
    original: str
    rewritten: str
    change_type: str
    reason: str
    confidence: float


class HumanizationResponse(BaseModel):
    """Response for text humanization."""
    original_text: str
    rewritten_text: str
    mode: str
    changes: List[HumanizationChange] = []
    word_count_original: int
    word_count_rewritten: int
    preservation_check: Dict[str, Any]
    verification_passed: bool
    warnings: List[str] = []
    provider_used: str


class ComparisonRequest(BaseModel):
    """Request for comparison."""
    original_text: str
    rewritten_text: str


class ComparisonResponse(BaseModel):
    """Response for comparison."""
    diff: List[Dict[str, Any]]
    additions: int
    deletions: int
    modifications: int
    unchanged: int
    word_count_original: int
    word_count_rewritten: int


class ExportRequest(BaseModel):
    """Request for export."""
    text: str
    format: str = Field(..., pattern="^(pdf|docx|txt)$")
    include_annotations: bool = False
    title: Optional[str] = None


class ExportResponse(BaseModel):
    """Response for export."""
    download_url: str
    filename: str
    file_size: int
    format: str


class WritingAnalysisRequest(BaseModel):
    """Request for writing analysis."""
    text: str = Field(..., min_length=1)


class WritingAnalysisResponse(BaseModel):
    """Response for writing analysis."""
    readability_score: float
    readability_level: str
    avg_sentence_length: float
    sentence_count: int
    word_count: int
    repeated_phrases: List[Dict[str, Any]]
    grammar_issues: List[Dict[str, Any]]
    clarity_suggestions: List[str]
    tone_consistency: Dict[str, Any]
    paragraph_analysis: Dict[str, Any]
    objective_metrics: Dict[str, Any]
    subjective_assessment: Dict[str, Any]
    disclaimers: List[str]
