import sys
import os
import unittest
import hashlib

# Import the shared GenLayer mock and compiled contract from the canonical test suite
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from test_bio_intel_escrow import (
    mock_mod,
    contract_module,
    MockAddress,
    MockBigInt,
    MockUserError,
)

class TestGenLayerDirectModeConsensusSuite(unittest.TestCase):
    """
    GenLayer Direct Mode & Studio Simulation Test Suite.
    Explicitly covers the 3 steward review requirements:
    1. Evidence drift during dispute resolution (referee refuses to evaluate tampered bytes).
    2. Validator disagreement under GenLayer Optimistic Democracy + Equivalence Principle.
    3. Withdrawal settlement pull pattern (emit_transfer with native bigint value, no u256 crash).
    """
    def setUp(self):
        self.gl = mock_mod.gl
        self.gl.transfers = []
        self.gl.message_raw = {"datetime": "2026-08-23T00:00:00+00:00"}
        self.admin = MockAddress("0xadmin")
        self.sponsor = MockAddress("0xsponsor_desci_dao")
        self.lab = MockAddress("0xreplication_lab")

        self.gl.message.sender_address = self.admin
        self.contract = contract_module.Contract()
        self.contract.tasks = {}
        self.contract.task_ids = []
        self.contract.withdrawable_balances = {}
        self.contract.platform_admin = self.admin.lower()

        # Define canonical baseline protocol content and its immutable SHA-256 hash
        self.proto_content = "CRISPR-Cas12a Cleavage Kinetic Replication Specification Standard v1.0"
        self.proto_hash = hashlib.sha256(self.proto_content.encode("utf-8")).hexdigest()

        # Define canonical telemetry log content and its immutable SHA-256 hash
        self.log_content = "Mocked spectrometry data R^2=0.994, p=0.0005, CV=3.2%"
        self.log_hash = hashlib.sha256(self.log_content.encode("utf-8")).hexdigest()

        # Default web render returns matching contents
        self.gl.nondet.web.render = lambda url, mode="text": self.proto_content if "protocols.io" in url else self.log_content

        # Sponsor creates bounty with 2000 GEN escrow and mandatory protocol hash commitment
        self.tid = "assay_crispr_kinetic_direct_01"
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(2000)
        self.contract.create_assay_task(
            self.tid,
            "https://protocols.io/spec/crispr_cleavage.json",
            "CRISPR Cas12a Cleavage Kinetic Replication Assay",
            "p-value < 0.01, R^2 > 0.98, CV < 5%",
            "Negative control cleaved, baseline drift > 10%",
            protocol_spec_hash=f"sha256:{self.proto_hash}"
        )

    def test_01_evidence_drift_during_dispute_resolution_refuses_evaluation(self):
        """During dispute resolution, if evidence bytes drift from committed snapshot -> referee halts immediately without LLM eval"""
        tid_disp = "task_dispute_drift_direct"
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(1000)
        self.contract.create_assay_task(
            tid_disp,
            "https://protocols.io/spec.json",
            "Cas12a Assay", "Tol", "Ano",
            protocol_spec_hash=f"sha256:{self.proto_hash}"
        )

        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(200)
        self.contract.accept_assay_task(tid_disp)

        # Render valid content during initial submission
        self.gl.nondet.web.render = lambda url, mode="text": self.proto_content if "spec" in url else self.log_content
        self.gl.nondet.exec_prompt = lambda prompt, response_format="json": {
            "verdict": "APPROVED",
            "confidence": 95,
            "reason": "All tolerances met"
        }

        self.contract.submit_assay_telemetry(
            tid_disp,
            "https://lab.org/log.csv",
            assay_log_hash=f"sha256:{self.log_hash}"
        )

        # Sponsor files dispute within cooling-off period
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(100)  # 10% appeal bond
        self.contract.raise_dispute(tid_disp, reason="Suspected background blanking drift")
        self.assertEqual(self.contract.tasks[tid_disp].status, "DISPUTED")

        # Now simulate evidence drift: someone tampered with telemetry log URL before referee evaluates!
        tampered_telemetry = "TAMPERED TELEMETRY LOGS INJECTED AFTER DISPUTE"
        self.gl.nondet.web.render = lambda url, mode="text": self.proto_content if "spec" in url else tampered_telemetry

        # LLM mock should NEVER be called on drifted bytes!
        llm_called = False
        def mock_prompt_trap(prompt, response_format="json"):
            nonlocal llm_called
            llm_called = True
            return {"verdict": "RELEASE", "reason": "Evaluated tampered bytes"}
        self.gl.nondet.exec_prompt = mock_prompt_trap

        # Run referee dispute resolution
        self.contract.resolve_dispute_via_referee(tid_disp)

        # Assert referee refused to evaluate tampered bytes with LLM
        self.assertFalse(llm_called, "Referee must NEVER evaluate bytes that fail the original commitment!")
        task = self.contract.tasks[tid_disp]
        self.assertEqual(task.status, "CLOSED")
        self.assertIn("CRITICAL EVIDENCE INTEGRITY VIOLATION DURING DISPUTE", task.reason)
        # Slashed and refunded to sponsor
        self.assertGreater(self.contract.withdrawable_balances.get(self.sponsor.lower(), 0), 0)

    def test_02_validator_disagreement_consensus_failure(self):
        """Direct Mode / Studio test: Equivalence Principle divergence between leader and validator triggers consensus disagreement"""
        tid_neq = "task_consensus_divergence_direct"
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(1000)
        self.contract.create_assay_task(
            tid_neq,
            "https://protocols.io/spec.json",
            "Cas12a Assay", "Tol", "Ano",
            protocol_spec_hash=f"sha256:{self.proto_hash}"
        )

        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(200)
        self.contract.accept_assay_task(tid_neq)

        self.gl.nondet.web.render = lambda url, mode="text": self.proto_content if "spec" in url else self.log_content

        # Leader votes APPROVED, but when validator runs it votes REFUND -> Equivalence Principle divergence
        call_count = 0
        def divergent_prompt(prompt, response_format="json"):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"verdict": "APPROVED", "confidence": 90, "reason": "Leader says pass"}
            else:
                return {"verdict": "REFUND", "confidence": 90, "reason": "Validator says fail"}
        self.gl.nondet.exec_prompt = divergent_prompt

        # Consensus disagreement must raise MockUserError
        with self.assertRaises(MockUserError):
            self.contract.submit_assay_telemetry(
                tid_neq,
                "https://lab.org/log.csv",
                assay_log_hash=f"sha256:{self.log_hash}"
            )

    def test_03_withdrawal_settlement_pull_pattern(self):
        """Direct Mode / Studio test: Pull-over-Push safe withdrawal settlement ledger"""
        # Set withdrawable balance for test user
        test_user = MockAddress("0xwithdrawer_user_direct")
        self.contract._credit_balance(test_user, MockBigInt(500))
        self.assertEqual(self.contract.get_withdrawable_balance(test_user), "500")

        # Withdraw credits successfully (emits transfer with native bigint, no u256 crash)
        self.gl.message.sender_address = test_user
        self.contract.withdraw_credits()

        # Balance must now be zero and transfer emitted
        self.assertEqual(self.contract.get_withdrawable_balance(test_user), "0")
        self.assertEqual(len(self.gl.transfers), 1)
        self.assertEqual(self.gl.transfers[0]["to"], test_user.lower())
        self.assertEqual(self.gl.transfers[0]["value"], 500)

        # Subsequent withdrawal must revert because balance is zero
        with self.assertRaises(MockUserError):
            self.contract.withdraw_credits()

if __name__ == "__main__":
    unittest.main(verbosity=2)
