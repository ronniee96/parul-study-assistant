import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.aki_agent import AkiStudyAgent

class ASTEvaluatorSecurityTests(unittest.TestCase):
    def setUp(self):
        self.agent = AkiStudyAgent()

    def test_valid_arithmetic_expressions(self):
        cases = [
            ("15 * 8 + 4", 124),
            ("(100 - 20) / 4", 20.0),
            ("2 ^ 8", 256),
            ("-5 + 15", 10),
            ("10 % 3", 1),
            ("50 + 25 * 2", 100),
            ("2.5 * 4", 10.0),
        ]
        for expr, expected in cases:
            res = self.agent.query(expr)
            self.assertTrue(res.get("success"), f"Failed for expr: {expr}")
            self.assertEqual(res.get("mode"), "math_engine")
            self.assertIn(str(expected), res.get("response"))

    def test_division_by_zero_does_not_crash(self):
        # 10 / 0 should not raise ZeroDivisionError unhandled
        res = self.agent.query("10 / 0")
        self.assertIsNotNone(res)
        self.assertTrue(res.get("success"))
        # Should gracefully drop out of math engine to fallback
        self.assertNotEqual(res.get("mode"), "math_engine")

    def test_exponent_overflow_prevented(self):
        # Exponent too large: 2 ^ 100000
        res = self.agent.query("2 ^ 100000")
        self.assertIsNotNone(res)
        # Should not crash or hang
        self.assertNotEqual(res.get("mode"), "math_engine")

    def test_malicious_code_injection_rejected(self):
        malicious_payloads = [
            "__import__('os').system('ls')",
            "open('/etc/passwd').read()",
            "eval('1+1')",
            "exec('import os')",
            "[x for x in ().__class__.__bases__[0].__subclasses__()]",
            "globals()",
            "locals()",
            "1; import os; os.system('echo pwned')",
            "os.remove('file.txt')",
            "__builtins__",
        ]
        for payload in malicious_payloads:
            res = self.agent.query(payload)
            self.assertIsNotNone(res)
            # Must NOT evaluate as math
            self.assertNotEqual(res.get("mode"), "math_engine")
            self.assertNotEqual(res.get("agent"), "Academic Formula Engine")

if __name__ == "__main__":
    unittest.main()
