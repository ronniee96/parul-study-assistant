from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    VERY_SHORT_ANSWER = "very_short_answer"
    SHORT_ANSWER = "short_answer"
    DESCRIPTIVE = "descriptive"
    ESSAY = "essay"
    NUMERICAL = "numerical"
    DIFFERENTIATE = "differentiate"
    PROCESS_MECHANISM = "process_mechanism"
    CASE_STUDY = "case_study"
    DIAGRAM_BASED = "diagram_based"

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class BloomLevel(str, Enum):
    REMEMBERING = "remembering"
    UNDERSTANDING = "understanding"
    APPLYING = "applying"
    ANALYZING = "analyzing"
    EVALUATING = "evaluating"
    CREATING = "creating"

class QuestionItem(BaseModel):
    id: int
    type: str = "short_answer"
    question: str
    options: Optional[List[str]] = None
    correct_answer: str = ""
    explanation: str = ""
    topic: str = "General"
    subtopic: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    difficulty: str = "medium"
    bloom_level: Optional[str] = "understanding"
    marks: int = 2
    marks_suggestion: Optional[int] = 2
    category: Optional[str] = None
    key_points: Optional[List[str]] = None
    source_document_id: Optional[str] = None
    source_filename: Optional[str] = None
    source_pages: Optional[List[int]] = None
    source_evidence: Optional[str] = None
    generation_method: Optional[str] = "academic_engine"
    # Stage 2-4 audit fields
    evidence_score: Optional[float] = None
    historical_evidence: Optional[str] = None
    current_material_evidence: Optional[str] = None
    university_pattern_evidence: Optional[str] = None
    pros_evidence: Optional[List[str]] = None
    cons_evidence: Optional[List[str]] = None
    risk_analysis: Optional[str] = None
    confidence_label: Optional[str] = None
    adversarial_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    adversarial_reviewed: bool = False
    chunk_source: Optional[int] = None

class DocumentProvenance(BaseModel):
    document_id: str
    filename: str
    page_number: int
    section_heading: Optional[str] = None
    content_type: str = "text"  # definition, formula, table, list, process, comparison, concept
    snippet: str

class ExtractedAcademicElement(BaseModel):
    id: str
    element_type: str  # definition, formula, concept, process, comparison, advantage_disadvantage, numerical, table
    title: str
    content: str
    page_number: int
    document_id: str
    filename: str
    provenance: DocumentProvenance

class NormalizedAcademicDocument(BaseModel):
    document_id: str
    filename: str
    file_type: str
    total_pages: int
    word_count: int
    character_count: int
    headings: List[str] = []
    topics: List[str] = []
    definitions: List[Dict[str, Any]] = []
    formulas: List[Dict[str, Any]] = []
    elements: List[ExtractedAcademicElement] = []
    full_text: str

class UniversityExamSectionSpec(BaseModel):
    section_id: str
    name: str
    description: Optional[str] = None
    marks_per_question: Optional[float] = None
    num_questions: int
    compulsory_count: Optional[int] = None
    choice_rule: Optional[str] = None  # e.g., "Attempt any 3 out of 5", "Q.3 OR Q.3"
    total_marks: Optional[float] = None
    question_types: List[str] = ["short_answer"]

class UniversityExamProfile(BaseModel):
    university: str = "Not identified"
    faculty: Optional[str] = None
    program: Optional[str] = None
    semester: Optional[str] = None
    subject: str = "Subject"
    subject_code: Optional[str] = None
    exam_type: str = "Unspecified"  # Internal, External, Remedial, End-Term
    academic_year: Optional[str] = None
    duration_hours: Optional[float] = None
    total_marks: Optional[int] = None
    sections: List[UniversityExamSectionSpec] = []
    bloom_distribution: Dict[str, float] = {}
    theory_vs_numerical: Dict[str, float] = Field(default_factory=dict)
    recurring_command_verbs: List[str] = Field(default_factory=list)
    learned_from_past_papers: bool = False
    past_paper_count: int = 0

class MegaQuestionRequest(BaseModel):
    text: str = Field(min_length=20)
    num_questions: int = Field(default=300, ge=10, le=1000)
    question_types: List[str] = ["multiple_choice", "short_answer", "essay"]
    document_id: Optional[str] = "doc_1"
    filename: Optional[str] = "Uploaded Document"

class MegaQuestionResponse(BaseModel):
    success: bool
    questions: List[QuestionItem]
    total_generated: int
    method: str
    document_id: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None

class MultiDocQuestionsRequest(BaseModel):
    documents: List[Dict[str, Any]]  # [{"id": "doc_1", "filename": "...", "text": "..."}]
    num_per_document: int = 300
    question_types: List[str] = ["multiple_choice", "short_answer", "essay", "numerical", "differentiate"]

class MultiDocQuestionsResponse(BaseModel):
    success: bool
    total_raw_candidates: int
    total_after_dedup: int
    per_document_counts: Dict[str, int]
    cross_document_concepts: List[Dict[str, Any]]
    combined_questions: List[QuestionItem]

class RankRequest(BaseModel):
    questions: List[QuestionItem]
    material_text: str
    past_papers: Optional[List[str]] = None
    exam_profile: Optional[UniversityExamProfile] = None

class RankedResponse(BaseModel):
    all_300: List[QuestionItem]
    top_200: List[QuestionItem]
    top_100: List[QuestionItem]
    top_25: List[QuestionItem]
    stats: dict

class PredictionPipelineRequest(BaseModel):
    documents: List[Dict[str, Any]]  # List of {id, filename, text}
    past_papers: Optional[List[str]] = None
    exam_profile: Optional[UniversityExamProfile] = None
    subject_name: str = "Subject"
    subject_code: Optional[str] = None
    target_marks: int = 60
    preferred_types: Optional[List[str]] = None

class PredictionPipelineResponse(BaseModel):
    success: bool
    subject_name: str
    candidate_universe_count: int
    top_200_count: int
    top_100_count: int
    final_top_25_count: int
    candidate_pool: List[QuestionItem]
    top_200: List[QuestionItem]
    top_100: List[QuestionItem]
    top_25: List[QuestionItem]
    learned_exam_profile: UniversityExamProfile
    predicted_mock_paper: Dict[str, Any]
    topic_heatmap: Dict[str, Any]
    cross_document_map: List[Dict[str, Any]]
    methodology_notes: List[str]
    adversarial_review_status: str = "not_run"
    adversarial_reviewed_count: int = 0
    per_document_candidate_counts: Dict[str, int] = Field(default_factory=dict)

class ExamSection(BaseModel):
    name: str
    marks_per_question: float
    num_questions: int
    total_marks: float
    questions: List[QuestionItem]

class ExamPredictionRequest(BaseModel):
    material_text: str = Field(min_length=20)
    past_papers: Optional[List[str]] = None
    subject_name: str = "Subject"
    total_marks: int = 60

class ExamPredictionResponse(BaseModel):
    success: bool
    subject_name: str
    total_marks: int
    time_hours: float = 3.0
    overall_confidence: float
    topic_heatmap: dict
    sections: List[ExamSection]

class AnswerItem(BaseModel):
    question_id: int
    question: str
    answer: str
    key_points: List[str]
    marks: int
    word_count_suggestion: int

class AnswerGenerationRequest(BaseModel):
    questions: List[QuestionItem]
    source_text: str = Field(min_length=20)

class AnswerGenerationResponse(BaseModel):
    success: bool
    answers: List[AnswerItem]
    total: int
