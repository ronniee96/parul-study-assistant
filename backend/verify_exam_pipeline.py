import os
import sys
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VERIFY_EXAM_PIPELINE")

from app.models.schemas import (
    ExtractedAcademicElement,
    DocumentProvenance,
    NormalizedAcademicDocument,
    UniversityExamProfile,
    UniversityExamSectionSpec
)
from app.services.document_intelligence import DocumentIntelligence
from app.services.question_possibility_engine import QuestionPossibilityEngine
from app.services.exam_prediction_pipeline import ExamPredictionPipeline
from app.services.paper_structure_analyzer import PaperStructureAnalyzer
from app.services.parul_repository import ParulRepositoryHarvester

def test_document_intelligence_extraction():
    logger.info("=== STEP 1: Testing Document Intelligence Extraction ===")
    sample_text = """
    Department of Computer Science & Engineering
    CSE301: Database Management Systems
    Unit 1: Relational Data Model and Normalization
    
    1.1 Relational Model Concepts
    Definition: A relational database is a collection of data items with pre-defined relationships between them.
    In the relational model, data is organized into tables (relations) consisting of rows (tuples) and columns (attributes).
    Primary Key: A candidate key chosen by the database designer to identify tuples uniquely in a relation.
    Foreign Key: An attribute or set of attributes in a table whose values are required to match values of a key in another table.
    
    1.2 Normal Forms and Anomalies
    First Normal Form (1NF): Each column contains atomic values, with no repeating groups.
    Second Normal Form (2NF): Meets 1NF requirements and all non-key attributes are fully functionally dependent on the primary key.
    Third Normal Form (3NF): Meets 2NF and has no transitive dependency: X -> Y where neither is a candidate key.
    Boyce-Codd Normal Form (BCNF): For every functional dependency X -> Y, X must be a super key.
    
    Formula for relational algebra:
    Selection: sigma_{condition}(R)
    Projection: pi_{attribute_list}(R)
    Cartesian Product: R times S
    Join Condition: R bowtie_{condition} S
    
    Comparison: BCNF vs 3NF
    In 3NF, functional dependencies where Y is a prime attribute are permitted even if X is not a super key.
    In BCNF, this is strictly disallowed. Therefore, every BCNF relation is in 3NF, but not every 3NF relation is in BCNF.
    
    Unit 2: Transaction Management and ACID Properties
    Atomicity: All operations in a transaction succeed, or none do.
    Consistency: The database remains in a valid state before and after the transaction.
    Isolation: Concurrent execution of transactions yields the same state as serial execution.
    Durability: Committed transactions persist permanently even during system failure.
    Two-Phase Locking Protocol (2PL) ensures serializability by dividing locks into Growing Phase and Shrinking Phase.
    
    Unit 3: Storage, Indexing and Query Processing
    Indexing: A data structure technique used to quickly locate and access data in a database.
    B-Tree Index: A balanced search tree that maintains sorted keys and allows sequential access.
    B+ Tree Index: All data records are stored exclusively in leaf nodes linked as a doubly-linked list.
    Hash Index: Uses a hash function to map search keys to specific bucket addresses.
    Clustered Index: Determines the physical storage order of rows in a table.
    Non-Clustered Index: Contains a separate index structure with pointers to the data rows.
    Query Optimization: The process of selecting the most efficient evaluation plan for executing a query.
    Cost Model: Evaluates disk I/O, CPU time, and communication overhead for relational operators.
    """
    doc_dict = DocumentIntelligence.extract_rich_document(
        file_content=sample_text.encode("utf-8"),
        filename="dbms_syllabus.txt"
    )
    assert doc_dict["document_id"] is not None
    assert doc_dict["filename"] == "dbms_syllabus.txt"
    assert len(doc_dict["topics"]) > 0
    assert len(doc_dict["definitions"]) > 0
    assert len(doc_dict["elements"]) > 0
    logger.info(f"Extracted {len(doc_dict['topics'])} topics, {len(doc_dict['definitions'])} definitions, {len(doc_dict['formulas'])} formulas, {len(doc_dict['comparisons'])} comparisons.")
    return doc_dict

def test_question_possibility_engine(doc1):
    logger.info("=== STEP 2: Testing Question Possibility Engine (1 doc vs 2 docs) ===")
    engine = QuestionPossibilityEngine()
    
    # 1 Document Pool (target: 300)
    candidates_doc1 = engine.generate_document_universe(doc1, target_count=300)
    logger.info(f"Document 1 generated {len(candidates_doc1)} candidates (target: ~300).")
    assert len(candidates_doc1) >= 100, f"Expected at least 100 questions, got {len(candidates_doc1)}"
    
    # Verify cognitive variety & Bloom taxonomy
    bloom_counts = {}
    type_counts = {}
    for q in candidates_doc1:
        bloom_counts[q.bloom_level] = bloom_counts.get(q.bloom_level, 0) + 1
        type_counts[q.type] = type_counts.get(q.type, 0) + 1
    
    logger.info(f"Bloom distribution: {bloom_counts}")
    logger.info(f"Question types: {type_counts}")
    
    # Verify MCQ format integrity
    mcqs = [q for q in candidates_doc1 if getattr(q.type, "value", q.type) == "multiple_choice"]
    if mcqs:
        sample_mcq = mcqs[0]
        assert sample_mcq.options and len(sample_mcq.options) == 4, f"MCQ must have 4 options: {sample_mcq}"
        assert sample_mcq.correct_answer, "MCQ must have correct_answer"
        logger.info(f"MCQ sample verified: {sample_mcq.question} | Ans: {sample_mcq.correct_answer}")
    
    # 2 Documents Pool (Cumulative)
    sample_text_2 = """
    Department of Computer Science & Engineering
    CSE302: Operating Systems
    Unit 1: Process Management and CPU Scheduling
    Process: An instance of a computer program that is being executed by one or many threads.
    Process Control Block (PCB): A data structure containing information about the process status.
    Scheduling algorithms: FCFS, SJF, Priority Scheduling, and Round Robin (RR) with time quantum q.
    Deadlock: A situation where a set of processes are blocked because each is holding a resource and waiting for another.
    Deadlock Conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.
    Banker's Algorithm: Used for deadlock avoidance by verifying safe state before resource allocation.
    
    Unit 2: Memory Management and Virtual Memory
    Virtual Memory: A storage allocation scheme in which secondary memory can be addressed as though it were main memory.
    Paging: A memory management scheme by which a computer stores and retrieves data from secondary storage for use in main memory.
    Page Table: The data structure used by a virtual memory system in a computer operating system to store the mapping between virtual and physical addresses.
    Translation Lookaside Buffer (TLB): A hardware cache that memory management hardware uses to improve virtual address translation speed.
    Segmentation: A memory management technique in which each job is divided into several segments of varying sizes.
    Page Replacement: Algorithms used to decide which memory pages to page out when a page of memory needs to be allocated.
    Belady's Anomaly: The phenomenon in which increasing the number of page frames results in an increase in the number of page faults for certain memory access patterns.
    
    Unit 3: Storage Systems, File Management and Concurrency
    File System: The structure that an operating system uses to organize and keep track of files.
    Inode: A data structure on a traditional Unix-style file system that describes a file-system object such as a file or a directory.
    Critical Section: A piece of code that accesses shared resources that must not be concurrently accessed by more than one thread.
    Semaphore: A variable or abstract data type used to control access to a common resource by multiple processes.
    Mutex: A mutual exclusion locking mechanism used to synchronize access to a resource.
    Disk Scheduling: Algorithms including FCFS, SSTF, SCAN, and C-SCAN to determine the order of servicing I/O requests.
    """
    doc2 = DocumentIntelligence.extract_rich_document(
        file_content=sample_text_2.encode("utf-8"),
        filename="os_syllabus.txt"
    )
    
    multi_pool = engine.process_multiple_documents([doc1, doc2], target_per_doc=300)
    logger.info(f"Multi-document cumulative candidates before dedup: {multi_pool['total_raw_candidates']} (Doc 1: 300, Doc 2: 300 -> Total ~600)")
    logger.info(f"Multi-document unique candidates after dedup: {multi_pool['total_after_dedup']}")
    assert multi_pool['total_raw_candidates'] >= 200, "Expected cumulative questions ~600"
    
    return doc1, candidates_doc1

def test_paper_structure_analyzer():
    logger.info("=== STEP 3: Testing Paper Structure Analyzer ===")
    sample_pyq = """
    PARUL UNIVERSITY
    FACULTY OF ENGINEERING & TECHNOLOGY
    B.TECH SEMESTER V EXAMINATION
    Subject Code: 203105301
    Subject Name: Database Management Systems
    Time: 3 Hours
    Total Marks: 60
    
    Instructions:
    1. Attempt all questions.
    2. Make suitable assumptions wherever necessary.
    3. Figures to the right indicate full marks.
    
    SECTION - A
    Q.1 (a) Define DBMS and state its primary goals. [2]
    Q.1 (b) What is Boyce-Codd Normal Form? [2]
    Q.1 (c) Explain ACID properties of transactions. [2]
    Q.1 (d) Define foreign key with an example. [2]
    Q.1 (e) What is a trigger in SQL? [2]
    
    SECTION - B
    Q.2 (a) Explain 1NF, 2NF and 3NF with suitable relational tables. [5]
    OR
    Q.2 (b) Discuss the two-phase locking protocol and explain how it prevents cascading aborts. [5]
    
    Q.3 (a) Explain relational algebra operators with syntax and examples: Selection, Projection, Union, Join. [5]
    Q.3 (b) What is functional dependency? Explain Armstrong axioms. [5]
    
    SECTION - C
    Q.4 (a) Critically analyze conflict serializability vs view serializability with precedence graph construction. [10]
    OR
    Q.4 (b) Design an ER diagram for a University Management System covering Student, Course, Faculty and Department entities with Cardinality constraints. [10]
    """
    profile = PaperStructureAnalyzer.analyze_paper_structure(sample_pyq, "sample_pyq.txt")
    logger.info(f"Extracted Profile: Duration={profile.duration_hours}h, Total Marks={profile.total_marks}, Sections={len(profile.sections)}")
    assert profile.total_marks == 60, f"Expected 60 marks, got {profile.total_marks}"
    assert len(profile.sections) >= 3, f"Expected at least 3 sections, got {len(profile.sections)}"
    return profile

def test_exam_prediction_pipeline(candidates, profile, doc1):
    logger.info("=== STEP 4: Testing 4-Stage Prediction Funnel (Universe -> Top 200 -> Top 100 -> Final 25) ===")
    pipeline = ExamPredictionPipeline()
    result = pipeline.run_pipeline(
        candidate_pool=candidates,
        material_text=doc1.get("full_text", ""),
        exam_profile=profile,
        subject_name="Database Management Systems"
    )
    
    logger.info(f"Funnel Universe Count: {result['candidate_universe_count']}")
    logger.info(f"Funnel Top 200 Count: {result['top_200_count']}")
    logger.info(f"Funnel Top 100 (Adversarial) Count: {result['top_100_count']}")
    logger.info(f"Funnel Final Top 25 Count: {result['final_top_25_count']}")
    
    assert len(result["top_25"]) == 25, f"Expected exactly 25 top predictions, got {len(result['top_25'])}"
    
    # Inspect top prediction for evidence, risk notes, and confidence labels
    top_q = result["top_25"][0]
    logger.info(f"Top #1 Prediction: '{top_q.question}'")
    logger.info(f"  Confidence Label: {top_q.confidence_label}")
    logger.info(f"  Evidence Score: {top_q.confidence}")
    logger.info(f"  Pros Evidence: {top_q.pros_evidence}")
    logger.info(f"  Cons / Counter-Evidence: {top_q.cons_evidence}")
    logger.info(f"  Risk Analysis: {top_q.risk_analysis}")
    
    # Verification of strict honesty constraint: No 100% false guarantees
    assert top_q.confidence < 1.0, "Confidence score must never claim 100% false certainty"
    assert "100%" not in (top_q.confidence_label or ""), "Confidence label must not claim 100% guarantee"
    assert top_q.risk_analysis, "Must provide explicit risk analysis of what could invalidate prediction"
    
    logger.info(f"Generated University Paper Sections: {len(result['predicted_mock_paper'])}")
    return result

def test_parul_repository():
    logger.info("=== STEP 5: Testing Parul PYQ Repository Service ===")
    import asyncio
    parul_svc = ParulRepositoryHarvester()
    search_results = asyncio.run(parul_svc.search_repository(query="Database"))
    logger.info(f"Parul Repository Query returned {len(search_results)} past papers.")
    assert len(search_results) > 0, "Expected at least 1 result from repository index"
    first = search_results[0]
    logger.info(f"Sample PYQ: {first.get('title')} | Code: {first.get('subject_code')} | Year: {first.get('year', '2023')}")

def main():
    try:
        doc = test_document_intelligence_extraction()
        doc, candidates = test_question_possibility_engine(doc)
        profile = test_paper_structure_analyzer()
        funnel_result = test_exam_prediction_pipeline(candidates, profile, doc)
        test_parul_repository()
        print("\n" + "="*60)
        print(">>> ALL 5 FORENSIC VERIFICATION TESTS PASSED SUCCESSFULLY! <<<")
        print("="*60 + "\n")
    except Exception as e:
        logger.exception(f"Verification test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
