import { generateDynamicQuestions } from './src/utils/questionGenerator.js';
import assert from 'assert';

console.log('🧪 Starting Multi-Subject Question Generator Test Suite\n');

// 1. Test short text (<50 characters)
console.log('Test 1: Short text (< 50 characters)...');
const shortRes = generateDynamicQuestions('Too short');
assert.strictEqual(Array.isArray(shortRes), true);
assert.strictEqual(shortRes.length, 0, 'Should return empty array for text under 50 characters');
console.log('✓ Passed: Short text handled safely without crashing (0 questions generated).\n');

// 2. Test Computer Science / DSA subject
console.log('Test 2: Data Structures & Algorithms Subject...');
const dsaText = `
Data Structures and Algorithms Syllabus:
Binary Search Tree (BST) is defined as a node-based binary tree data structure where each node has at most two children. The left subtree contains only nodes with keys less than the node key, and the right subtree contains only nodes with keys greater than the node key.
Algorithm time complexity for search, insertion, and deletion operations in a balanced BST is O(log n). In the worst-case scenario when the tree is degenerate, the time complexity degrades to O(n).
AVL Tree is a self-balancing binary search tree where the difference between heights of left and right subtrees cannot be more than one for all nodes. The balance factor is calculated as height(left) minus height(right).
Graph Traversal Algorithms include Breadth First Search (BFS) and Depth First Search (DFS). BFS uses a queue data structure and explores all neighbor vertices at the present depth before moving to vertices at the next depth level. DFS uses a stack data structure or recursion to explore as far as possible along each branch before backtracking.
Dijkstra's Algorithm is an algorithm for finding the shortest paths between nodes in a weighted graph with non-negative edge weights.
Dynamic Programming is an algorithmic technique for solving optimization problems by breaking them down into simpler subproblems and storing results in a lookup table.
`;

const dsaQuestions = generateDynamicQuestions(dsaText, 'dsa_syllabus.pdf');
assert.ok(dsaQuestions.length > 5, 'Should generate substantial questions from rich text');
console.log(`✓ Generated ${dsaQuestions.length} questions for DSA.`);

// Verify no MBA Cost Accounting terms
const mbaTerms = ['marginal costing', 'break-even', 'cost sheet', 'variance analysis', 'cals'];
for (const q of dsaQuestions) {
  for (const term of mbaTerms) {
    assert.ok(
      !q.question.toLowerCase().includes(term) && !q.topic.toLowerCase().includes(term),
      `Found forbidden MBA term '${term}' in DSA question: "${q.question}"`
    );
  }
}
console.log('✓ Passed: Zero hardcoded MBA Cost Accounting leakage in DSA questions.\n');

// 3. Test Legal Studies / Constitutional Law Subject
console.log('Test 3: Constitutional Law Subject...');
const lawText = `
Constitutional Law and Jurisprudence:
Article 21 of the Constitution of India guarantees the Protection of Life and Personal Liberty. It states that no person shall be deprived of his life or personal liberty except according to procedure established by law.
In the landmark Maneka Gandhi case (1978), the Supreme Court expanded the scope of Article 21, establishing that the procedure must be just, fair, and reasonable, incorporating the doctrine of substantive due process.
Fundamental Rights are enshrined in Part III of the Constitution from Articles 12 to 35. These include Right to Equality (Articles 14-18), Right to Freedom (Articles 19-22), and Right to Constitutional Remedies (Article 32).
The Doctrine of Basic Structure was propounded in the Kesavananda Bharati case (1973), ruling that Parliament cannot alter the essential features or basic framework of the Constitution under Article 368.
Judicial Review is the power of the judiciary to examine the constitutionality of legislative enactments and executive orders.
Writ Jurisdiction under Article 32 and Article 226 allows the Supreme Court and High Courts to issue writs of Habeas Corpus, Mandamus, Prohibition, Quo Warranto, and Certiorari for the enforcement of fundamental rights.
`;

const lawQuestions = generateDynamicQuestions(lawText, 'constitutional_law.pdf');
assert.ok(lawQuestions.length > 5, 'Should generate questions for Law');
console.log(`✓ Generated ${lawQuestions.length} questions for Constitutional Law.`);

// Check provenance and source grounding
for (const q of lawQuestions) {
  assert.ok(q.provenance, `Question ${q.id} missing provenance object`);
  assert.ok(q.provenance.sourceSnippet, `Question ${q.id} missing sourceSnippet`);
  assert.ok(
    lawText.toLowerCase().includes(q.provenance.sourceSnippet.toLowerCase().slice(0, 30)),
    `Question ${q.id} provenance snippet is not from source text!`
  );
  // Verify confidence is within bounds [50, 100]
  assert.ok(q.confidence >= 50 && q.confidence <= 100, `Confidence out of bounds: ${q.confidence}`);
  // Verify emoji absence
  assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(q.question), `Question ${q.id} has emoji: ${q.question}`);
  assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(q.answer), `Answer ${q.id} has emoji: ${q.answer}`);
}
console.log('✓ Passed: All Law questions have genuine source snippet provenance, valid confidence, and 0 emojis.\n');

// 4. Test Biology / Medical Subject with duplicate concepts
console.log('Test 4: Biology Subject with Repeated Concepts...');
const bioText = `
Cellular Respiration and Biochemistry:
Mitochondria are double-membraned organelles known as the powerhouse of the cell. Mitochondria generate most of the chemical energy needed to power the cell's biochemical reactions.
Mitochondria are double-membraned organelles known as the powerhouse of the cell. Mitochondria generate ATP.
Glycolysis is the metabolic pathway that converts glucose into pyruvate. The free energy released in this process is used to form high-energy molecules ATP and NADH.
Glycolysis is the metabolic pathway that converts glucose into pyruvate.
Krebs Cycle occurs in the mitochondrial matrix and produces NADH and FADH2 for the electron transport chain.
Oxidative Phosphorylation is the metabolic pathway in which cells use enzymes to oxidize nutrients, releasing chemical energy in order to produce adenosine triphosphate (ATP).
`;

const bioQuestions = generateDynamicQuestions(bioText, 'cellular_respiration.pdf');
console.log(`✓ Generated ${bioQuestions.length} questions for Biology.`);

// Verify question deduplication
const questionTexts = new Set();
for (const q of bioQuestions) {
  assert.ok(!questionTexts.has(q.question), `Duplicate question generated: "${q.question}"`);
  questionTexts.add(q.question);
}
console.log('✓ Passed: Zero duplicate questions generated despite repeated concepts in source text.\n');

console.log('🎉 ALL MULTI-SUBJECT QUESTION GENERATION TESTS PASSED CLEANLY!');
