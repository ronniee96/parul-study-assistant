from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    CASE_STUDY = "case_study"

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class QuestionItem(BaseModel):
    id: int
    type: QuestionType
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str
    topic: str
    confidence: float = Field(ge=0.0, le=1.0)
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    marks: int = 2

class MegaQuestionRequest(BaseModel):
    text: str = Field(min_length=50)
    num_questions: int = Field(default=300, ge=10, le=500)
    question_types: List[str] = ["multiple_choice", "short_answer", "essay"]

class MegaQuestionResponse(BaseModel):
    success: bool
    questions: List[QuestionItem]
    total_generated: int
    method: str

class RankRequest(BaseModel):
    questions: List[QuestionItem]
    material_text: str
    past_papers: Optional[List[str]] = None

class RankedResponse(BaseModel):
    all_300: List[QuestionItem]
    top_200: List[QuestionItem]
    top_100: List[QuestionItem]
    top_25: List[QuestionItem]
    stats: dict

class ExamPredictionRequest(BaseModel):
    material_text: str = Field(min_length=50)
    past_papers: Optional[List[str]] = None
    subject_name: str = "Subject"
    total_marks: int = 60

class ExamSection(BaseModel):
    name: str
    marks_per_question: float
    num_questions: int
    total_marks: float
    questions: List[QuestionItem]

class ExamPredictionResponse(BaseModel):
    success: bool
    subject_name: str
    total_marks: int
    time_hours: int = 3
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
    source_text: str = Field(min_length=50)

class AnswerGenerationResponse(BaseModel):
    success: bool
    answers: List[AnswerItem]
    total: int
