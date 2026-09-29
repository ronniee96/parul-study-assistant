"""
Adaptive Learning Service
Provides ethical, user-consented personalization based on learning interactions
"""

import json
import logging
import re
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)

class AdaptiveLearningService:
    """
    Service for ethical adaptive learning features.
    All adaptation happens WITH explicit user consent and focuses on
    improving understanding rather than predicting exam questions.
    """

    def __init__(self, user_id: str = None, storage_path: str = "./user_data"):
        raw_id = str(user_id or "default_user").strip()
        self.user_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', raw_id) or "default_user"
        self.storage_path = storage_path
        self.profiles_dir = os.path.join(storage_path, "profiles")
        os.makedirs(self.profiles_dir, exist_ok=True)
        self.learning_profile = self._load_learning_profile()
        self.consent_given = bool(self.learning_profile.get("consent", {}).get("given", False))

    def give_consent(self, consent_types: List[str] = None) -> bool:
        """
        Record user consent for adaptive learning features
        """
        if consent_types is None:
            consent_types = [
                "performance_tracking",
                "study_pattern_analysis",
                "personalized_recommendations",
                "difficulty_adaptation"
            ]

        self.consent_given = True
        self.learning_profile["consent"] = {
            "given": True,
            "timestamp": datetime.now().isoformat(),
            "types": consent_types,
            "version": "1.0"
        }

        self._save_learning_profile()
        logger.info(f"User {self.user_id} gave consent for adaptive learning: {consent_types}")
        return True

    def withdraw_consent(self) -> bool:
        """
        Withdraw consent and optionally delete learning data
        """
        self.consent_given = False
        self.learning_profile["consent"] = {
            "given": False,
            "withdrawn": datetime.now().isoformat(),
            "previous_consent": self.learning_profile.get("consent", {})
        }

        # Optionally delete learning data (GDPR-style right to be forgotten)
        # Uncomment the next line if you want to delete data on consent withdrawal
        # self.learning_profile = {"user_id": self.user_id, "created": datetime.now().isoformat(), "consent": {"given": False}}

        self._save_learning_profile()
        logger.info(f"User {self.user_id} withdrew consent for adaptive learning")
        return True

    def record_question_performance(self, question_id: str, question_type: str,
                                  is_correct: bool, time_taken_seconds: float,
                                  topic: str = None, difficulty: str = "medium") -> Dict[str, Any]:
        """
        Record user's performance on a practice question for ethical adaptation
        """
        if not self.consent_given:
            logger.warning(f"Attempted to record performance without consent for user {self.user_id}")
            return {"error": "Consent required for performance tracking"}

        # Initialize performance tracking if needed
        if "performance" not in self.learning_profile:
            self.learning_profile["performance"] = {
                "questions": [],
                "topics": {},
                "question_types": {},
                "overall_stats": {
                    "total_questions": 0,
                    "correct_answers": 0,
                    "average_time": 0,
                    "start_date": datetime.now().isoformat()
                }
            }

        # Record the question attempt
        attempt = {
            "question_id": question_id,
            "question_type": question_type,
            "is_correct": is_correct,
            "time_taken": time_taken_seconds,
            "topic": topic or "general",
            "difficulty": difficulty,
            "timestamp": datetime.now().isoformat()
        }

        self.learning_profile["performance"]["questions"].append(attempt)

        # Update topic statistics
        if topic:
            if topic not in self.learning_profile["performance"]["topics"]:
                self.learning_profile["performance"]["topics"][topic] = {
                    "attempts": 0,
                    "correct": 0,
                    "total_time": 0.0
                }

            topic_stats = self.learning_profile["performance"]["topics"][topic]
            topic_stats["attempts"] += 1
            if is_correct:
                topic_stats["correct"] += 1
            topic_stats["total_time"] += time_taken_seconds

        # Update question type statistics
        if question_type not in self.learning_profile["performance"]["question_types"]:
            self.learning_profile["performance"]["question_types"][question_type] = {
                "attempts": 0,
                "correct": 0,
                "total_time": 0.0
            }

        qtype_stats = self.learning_profile["performance"]["question_types"][question_type]
        qtype_stats["attempts"] += 1
        if is_correct:
            qtype_stats["correct"] += 1
        qtype_stats["total_time"] += time_taken_seconds

        # Update overall stats
        overall = self.learning_profile["performance"]["overall_stats"]
        overall["total_questions"] += 1
        if is_correct:
            overall["correct_answers"] += 1

        # Recalculate average time
        total_time = sum(q["time_taken"] for q in self.learning_profile["performance"]["questions"])
        overall["average_time"] = total_time / overall["total_questions"] if overall["total_questions"] > 0 else 0

        self._save_learning_profile()

        # Return adaptive insights
        return self._get_adaptive_insights()

    def get_personalized_recommendations(self) -> Dict[str, Any]:
        """
        Generate personalized study recommendations based on user performance
        ONLY works with user consent
        """
        if not self.consent_given:
            return {
                "error": "Consent required for personalized recommendations",
                "suggestion": "Please provide consent in the settings to receive personalized study recommendations"
            }

        if "performance" not in self.learning_profile or not self.learning_profile["performance"]["questions"]:
            return {
                "message": "Start answering questions to get personalized recommendations",
                "suggestion": "Answer some practice questions first to build your learning profile"
            }

        performance = self.learning_profile["performance"]
        overall = performance["overall_stats"]

        # Calculate accuracy rate
        accuracy_rate = overall["correct_answers"] / overall["total_questions"] if overall["total_questions"] > 0 else 0

        # Identify weak topics
        weak_topics = []
        strong_topics = []

        for topic, stats in performance["topics"].items():
            if stats["attempts"] >= 3:  # Only consider topics with sufficient data
                topic_accuracy = stats["correct"] / stats["attempts"]
                if topic_accuracy < 0.6:
                    weak_topics.append({
                        "topic": topic,
                        "accuracy": topic_accuracy,
                        "attempts": stats["attempts"],
                        "suggestion": f"Review {topic} - you've answered {stats['attempts']} questions with {topic_accuracy:.1%} accuracy"
                    })
                elif topic_accuracy > 0.8:
                    strong_topics.append({
                        "topic": topic,
                        "accuracy": topic_accuracy,
                        "attempts": stats["attempts"],
                        "suggestion": f"Strong in {topic}! Consider helping peers or exploring advanced applications"
                    })

        # Suggest question types to practice
        type_recommendations = []
        for qtype, stats in performance["question_types"].items():
            if stats["attempts"] >= 3:
                type_accuracy = stats["correct"] / stats["attempts"]
                if type_accuracy < 0.7:
                    type_recommendations.append({
                        "question_type": qtype,
                        "accuracy": type_accuracy,
                        "suggestion": f"Practice more {qtype} questions to improve your {type_accuracy:.1%} accuracy"
                    })

        # Generate study session recommendations
        study_suggestions = []

        if accuracy_rate < 0.5:
            study_suggestions.append("Consider reviewing foundational concepts before attempting practice questions")
        elif accuracy_rate < 0.7:
            study_suggestions.append("Focus on understanding why answers are correct/incorrect, not just memorizing")
        else:
            study_suggestions.append("Great progress! Try explaining concepts to others to deepen understanding")

        avg_time = overall["average_time"]
        if avg_time > 60:  # More than 1 minute per question on average
            study_suggestions.append("You're taking time to think through questions - this is good for deep learning")
        elif avg_time < 10:  # Less than 10 seconds per question
            study_suggestions.append("Consider slowing down to ensure you're reading questions carefully")

        # Recent performance trend
        recent_questions = performance["questions"][-10:] if len(performance["questions"]) >= 10 else performance["questions"]
        if recent_questions:
            recent_correct = sum(1 for q in recent_questions if q["is_correct"])
            recent_accuracy = recent_correct / len(recent_questions) if recent_questions else 0

            if len(performance["questions"]) >= 20:
                earlier_questions = performance["questions"][-20:-10] if len(performance["questions"]) >= 20 else []
                if earlier_questions:
                    earlier_correct = sum(1 for q in earlier_questions if q["is_correct"])
                    earlier_accuracy = earlier_correct / len(earlier_questions) if earlier_questions else 0

                    if recent_accuracy > earlier_accuracy + 0.1:
                        study_suggestions.append("Your recent performance shows improvement - keep up the good work!")
                    elif recent_accuracy < earlier_accuracy - 0.1:
                        study_suggestions.append("Recent performance has dipped - consider reviewing recent topics")

        return {
            "success": True,
            "user_id": self.user_id,
            "consent_status": "given",
            "learning_summary": {
                "total_questions_answered": overall["total_questions"],
                "overall_accuracy": f"{accuracy_rate:.1%}",
                "average_time_per_question": f"{overall['average_time']:.1f} seconds",
                "study_streak_days": self._calculate_study_streak(),
                "strengths": [t["topic"] for t in strong_topics[:3]],
                "areas_for_improvement": [t["topic"] for t in weak_topics[:3]]
            },
            "personalized_recommendations": {
                "focus_topics": [t["topic"] for t in weak_topics[:3]],
                "question_types_to_practice": [t["question_type"] for t in type_recommendations[:2]],
                "study_suggestions": study_suggestions[:4],  # Limit to top 4 suggestions
                "next_steps": self._generate_next_steps(weak_topics, strong_topics, accuracy_rate)
            },
            "adaptive_difficulty_suggestion": self._suggest_difficulty_level(accuracy_rate),
            "generated_at": datetime.now().isoformat()
        }

    def suggest_question_difficulty(self, recent_performance: List[bool] = None) -> str:
        """
        Suggest appropriate difficulty level for next questions based on recent performance
        ONLY works with user consent
        """
        if not self.consent_given:
            return "medium"  # Default fallback

        # If we have recent performance data, use it
        if recent_performance is None and "performance" in self.learning_profile:
            recent = self.learning_profile["performance"]["questions"][-5:]  # Last 5 questions
            recent_performance = [q["is_correct"] for q in recent] if recent else [True, True, False, True, False]  # Default pattern

        if not recent_performance:
            return "medium"

        correct_streak = 0
        for correct in reversed(recent_performance):  # Check from most recent
            if correct:
                correct_streak += 1
            else:
                break

        # Adaptive logic: increase difficulty after success, decrease after struggle
        if correct_streak >= 4:
            return "hard"
        elif correct_streak >= 2:
            return "medium"
        elif correct_streak == 0:
            return "easy"
        else:
            return "medium"

    def get_learning_insights(self) -> Dict[str, Any]:
        """
        Provide insights about learning patterns and habits
        ONLY works with user consent
        """
        if not self.consent_given:
            return {
                "error": "Consent required for learning insights",
                "suggestion": "Provide consent to receive insights about your learning patterns"
            }

        if "performance" not in self.learning_profile:
            return {
                "message": "No learning data available yet",
                "suggestion": "Start using the study assistant to generate learning insights"
            }

        performance = self.learning_profile["performance"]
        overall = performance["overall_stats"]

        # Calculate study consistency
        dates = []
        for q in performance["questions"]:
            try:
                date_str = q["timestamp"].split("T")[0]  # Extract date part
                dates.append(date_str)
            except:
                pass

        unique_dates = list(set(dates)) if dates else []
        study_streak = self._calculate_study_streak_from_dates(unique_dates) if dates else 0

        # Time of day preferences
        hours = []
        for q in performance["questions"]:
            try:
                time_str = q["timestamp"].split("T")[1].split(":")[0]  # Extract hour
                hours.append(int(time_str))
            except:
                pass

        hour_distribution = {}
        for h in hours:
            hour_distribution[h] = hour_distribution.get(h, 0) + 1

        peak_hour = max(hour_distribution.items(), key=lambda x: x[1])[0] if hour_distribution else None

        return {
            "success": True,
            "user_id": self.user_id,
            "insights_generated_at": datetime.now().isoformat(),
            "study_patterns": {
                "total_study_sessions": len(unique_dates),
                "average_questions_per_session": len(performance["questions"]) / max(len(unique_dates), 1),
                "study_streak_days": study_streak,
                "peak_study_hour": f"{peak_hour}:00" if peak_hour is not None else "Variable",
                "most_active_hour": f"{peak_hour}:00" if peak_hour is not None else "Not enough data"
            },
            "performance_trends": {
                "overall_accuracy": f"{overall['correct_answers'] / max(overall['total_questions'], 1):.1%}",
                "improvement_trend": self._calculate_improvement_trend(performance["questions"]),
                "consistency_score": self._calculate_consistency_score(performance["questions"])
            },
            "recommendations": [
                f"Try to study regularly - even {max(1, study_streak//2)} days a week helps build retention",
                f"Consider reviewing during your peak hours ({peak_hour}:00 if detected) for optimal retention",
                "Spaced repetition is more effective than cramming for long-term retention"
            ]
        }

    # Private helper methods
    def _load_learning_profile(self) -> Dict[str, Any]:
        """Load learning profile from storage"""
        profile_file = os.path.join(self.profiles_dir, f"{self.user_id}_profile.json")
        try:
            if os.path.exists(profile_file):
                with open(profile_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load learning profile for {self.user_id}: {str(e)}")

        # Return default profile
        return {
            "user_id": self.user_id,
            "created": datetime.now().isoformat(),
            "consent": {"given": False},
            "performance": {},
            "preferences": {}
        }

    def _save_learning_profile(self):
        """Save learning profile to storage"""
        if not self.user_id:
            return

        profile_file = os.path.join(self.profiles_dir, f"{self.user_id}_profile.json")
        try:
            with open(profile_file, 'w') as f:
                json.dump(self.learning_profile, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Could not save learning profile for {self.user_id}: {str(e)}")

    def _get_adaptive_insights(self) -> Dict[str, Any]:
        """Get immediate adaptive insights after recording performance"""
        return {
            "message": "Performance recorded successfully",
            "adaptive_features_available": self.consent_given,
            "next_question_difficulty_suggestion": self.suggest_question_difficulty() if self.consent_given else "medium",
            "consent_status": "given" if self.consent_given else "required"
        }

    def _calculate_study_streak(self) -> int:
        """Calculate current study streak in days"""
        if "performance" not in self.learning_profile:
            return 0

        dates = []
        for q in self.learning_profile["performance"]["questions"]:
            try:
                date_str = q["timestamp"].split("T")[0]
                dates.append(date_str)
            except:
                pass

        return self._calculate_streak_from_dates(dates)

    def _calculate_streak_from_dates(self, dates: List[str]) -> int:
        """Calculate streak from list of date strings"""
        if not dates:
            return 0

        # Convert to datetime objects and sort
        try:
            date_objs = [datetime.strptime(d, "%Y-%m-%d") for d in dates]
            date_objs.sort()

            # Calculate streak from most recent date
            streak = 0
            current_date = date_objs[-1]

            for i in range(len(date_objs) - 1, -1, -1):
                diff = (current_date - date_objs[i]).days
                if diff == streak:
                    streak += 1
                else:
                    break

            return streak
        except:
            return 0

    def _calculate_improvement_trend(self, questions: List[Dict]) -> str:
        """Calculate if performance is improving, declining, or stable"""
        if len(questions) < 6:
            return "insufficient_data"

        # Split into first half and second half
        mid_point = len(questions) // 2
        first_half = questions[:mid_point]
        second_half = questions[mid_point:]

        first_accuracy = sum(1 for q in first_half if q["is_correct"]) / len(first_half) if first_half else 0
        second_accuracy = sum(1 for q in second_half if q["is_correct"]) / len(second_half) if second_half else 0

        diff = second_accuracy - first_accuracy

        if diff > 0.1:
            return "improving"
        elif diff < -0.1:
            return "declining"
        else:
            return "stable"

    def _calculate_consistency_score(self, questions: List[Dict]) -> float:
        """Calculate consistency score (0-1, higher is more consistent)"""
        if len(questions) < 3:
            return 0.5

        # Calculate rolling accuracy over windows of 5 questions
        window_size = min(5, len(questions))
        accuracies = []

        for i in range(len(questions) - window_size + 1):
            window = questions[i:i+window_size]
            window_accuracy = sum(1 for q in window if q["is_correct"]) / len(window)
            accuracies.append(window_accuracy)

        if not accuracies:
            return 0.5

        # Consistency is inverse of standard deviation
        import math
        mean_accuracy = sum(accuracies) / len(accuracies)
        variance = sum((acc - mean_accuracy) ** 2 for acc in accuracies) / len(accuracies)
        std_dev = math.sqrt(variance) if variance > 0 else 0

        # Convert to 0-1 scale where 1 is perfectly consistent
        consistency = max(0, 1 - (std_dev * 2))  # Scale factor of 2
        return min(1, consistency)

    def _generate_next_steps(self, weak_topics: List[Dict], strong_topics: List[Dict], accuracy_rate: float) -> List[str]:
        """Generate actionable next steps"""
        steps = []

        if accuracy_rate < 0.4:
            steps.append("Go back to fundamentals - review basic concepts before attempting practice questions")
        elif accuracy_rate < 0.6:
            steps.append("Focus on understanding why answers are correct, not just memorizing them")
        else:
            steps.append("You're building solid understanding - now focus on application and analysis")

        if weak_topics:
            weak_topic_names = [t["topic"] for t in weak_topics[:2]]
            steps.append(f"Spend extra time reviewing: {', '.join(weak_topic_names)}")

        if strong_topics and len(strong_topics) > 1:
            steps.append("Consider teaching concepts you've mastered to reinforce your own understanding")

        steps.append("Regularly revisit material you've studied - spaced repetition improves long-term retention")

        return steps[:4]  # Limit to top 4 recommendations

    def _suggest_difficulty_level(self, accuracy_rate: float) -> str:
        """Suggest difficulty level based on overall accuracy"""
        if accuracy_rate < 0.5:
            return "easy"
        elif accuracy_rate < 0.7:
            return "medium"
        else:
            return "hard"

# Per-user service caching to ensure strict multi-tenant isolation
_user_services: Dict[str, AdaptiveLearningService] = {}

def get_adaptive_service(user_id: Optional[str] = None) -> AdaptiveLearningService:
    """Return an isolated AdaptiveLearningService instance scoped to user_id"""
    raw_id = str(user_id or "default_user").strip()
    safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', raw_id) or "default_user"
    if safe_id not in _user_services:
        _user_services[safe_id] = AdaptiveLearningService(user_id=safe_id)
    return _user_services[safe_id]

# Default instance for backwards-compatibility
adaptive_service = get_adaptive_service("default_user")

# Example usage
if __name__ == "__main__":
    # Simulate user giving consent
    service = AdaptiveLearningService("test_user_123")
    service.give_consent()

    # Simulate recording some performance
    service.record_question_performance("q1", "multiple_choice", True, 15.0, "strategy", "medium")
    service.record_question_performance("q2", "multiple_choice", False, 25.0, "finance", "hard")
    service.record_question_performance("q3", "short_answer", True, 40.0, "marketing", "medium")

    # Get personalized recommendations
    recommendations = service.get_personalized_recommendations()
    print("Adaptive Learning Service Ready")
    print(json.dumps(recommendations, indent=2, default=str))