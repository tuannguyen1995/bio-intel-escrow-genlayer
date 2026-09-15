import sys
import os
import unittest
import hashlib
from unittest.mock import MagicMock

class MockAddress(str): pass
class MockBigInt(int): pass
class MockUserError(Exception): pass

class MockReturn:
    def __init__(self, calldata):
        self.calldata = calldata

class MockContractStub:
    def __init__(self, address, tracker):
        self.address = address
        self.tracker = tracker

    def emit_transfer(self, value):
        self.tracker.append({"to": self.address, "value": value})

class MockGL:
    class Contract:
        def __init__(self):
            self.tasks = {}
            self.task_ids = []
            self.withdrawable_balances = {}
            self.platform_admin = "0xadmin"

    class public:
        @staticmethod
        def view(fn): return fn
        @staticmethod
        def write(fn): return fn

    class message:
        value = MockBigInt(0)
        sender_address = MockAddress("0xSponsor")

    class nondet:
        class web:
            @staticmethod
            def render(url, mode="text"): pass
        @staticmethod
        def exec_prompt(prompt, response_format="json"): pass

    class vm:
        Return = MockReturn
        @staticmethod
        def run_nondet(leader_fn, validator_fn):
            res = leader_fn()
            ret = MockReturn(calldata=res)
            if not validator_fn(ret):
                raise MockUserError("Consensus Disagreement")
            return res

    def __init__(self):
        self.transfers = []
        self.message_raw = {"datetime": "2026-08-23T00:00:00+00:00"}

    def get_contract_at(self, address):
        return MockContractStub(address, self.transfers)

MockGL.public.write.payable = lambda fn: fn

mock_mod = MagicMock()
mock_mod.gl = MockGL()
mock_mod.allow_storage = lambda cls: cls
mock_mod.Address = MockAddress
mock_mod.bigint = MockBigInt
mock_mod.u256 = MockBigInt
mock_mod.UserError = MockUserError
mock_mod.TreeMap = dict
mock_mod.DynArray = list

sys.modules["genlayer"] = mock_mod
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "contracts")))
import BioIntelEscrow as contract_module

class TestBioIntelEscrowExecutionSuite(unittest.TestCase):
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
        self.tid = "assay_crispr_kinetic_01"
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

    def test_01_under_staking_reverts(self):
        """Lab attempts to deposit < 20% stake (399 < 400) -> MUST REVERT"""
        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(399)
        with self.assertRaises(MockUserError):
            self.contract.accept_assay_task(self.tid)

    def test_02_valid_telemetry_approved_and_pull_settlement(self):
        """Telemetry approved by multi-agent board -> 24h delay enforced -> Pull settlement via withdraw_credits."""
        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(400) # 20% of 2000
        self.contract.accept_assay_task(self.tid)

        self.gl.nondet.web.render = lambda url, mode="text": self.proto_content if "protocols.io" in url else self.log_content
        self.gl.nondet.exec_prompt = lambda p, response_format="json": {
            "statistician_vote": "APPROVED",
            "biochemist_vote": "APPROVED",
            "contamination_vote": "APPROVED",
            "verdict": "APPROVED",
            "confidence": 99,
            "reason": "R^2=0.994, p<0.001, negative controls intact"
        }

        self.contract.submit_assay_telemetry(
            self.tid, 
            "https://lab-logs.org/telemetry_01.csv",
            assay_log_hash=f"sha256:{self.log_hash}",
            lab_provenance_sig="0x89abcdef12345678",
            provenance_type="LIMS_RAW_EXPORT",
            instrument_id="Biotek-Synergy-H1-48821"
        )
        self.assertEqual(self.contract.tasks[self.tid].status, "AWAITING_PAYOUT")

        # Early finalization attempt -> REVERT
        self.gl.message_raw = {"datetime": "2026-08-23T12:00:00+00:00"}
        with self.assertRaises(MockUserError):
            self.contract.finalize_payout(self.tid)

        # Finalization at T+24h01m -> SUCCEEDS and credits withdrawable vault
        self.gl.message_raw = {"datetime": "2026-08-24T00:01:00+00:00"}
        self.contract.finalize_payout(self.tid)
        self.assertEqual(self.contract.tasks[self.tid].status, "CLOSED")
        
        # Verify pull-over-push withdrawable credit balance (2000 bounty + 400 stake = 2400)
        self.assertEqual(self.contract.get_withdrawable_balance(self.lab), "2400")

        # Lab pulls settled credits via withdraw_credits()
        self.gl.message.sender_address = self.lab
        self.contract.withdraw_credits()
        self.assertEqual(self.gl.transfers[0]["to"], self.lab)
        self.assertEqual(self.gl.transfers[0]["value"], 2400)
        self.assertEqual(self.contract.get_withdrawable_balance(self.lab), "0")

    def test_03_dispute_flow_with_insufficient_bond_reverts(self):
        """Dispute attempt with < 10% appeal bond (199 < 200) -> MUST REVERT"""
        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(400)
        self.contract.accept_assay_task(self.tid)

        self.gl.nondet.exec_prompt = lambda p, response_format="json": {
            "statistician_vote": "APPROVED",
            "biochemist_vote": "APPROVED",
            "contamination_vote": "APPROVED",
            "verdict": "APPROVED",
            "confidence": 95,
            "reason": "Passed"
        }
        self.contract.submit_assay_telemetry(
            self.tid,
            "https://lab-logs.org/telemetry.csv",
            assay_log_hash=f"sha256:{self.log_hash}"
        )

        # Sponsor raises dispute with insufficient bond -> REVERT
        self.gl.message_raw = {"datetime": "2026-08-23T06:00:00+00:00"}
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(199)
        with self.assertRaises(MockUserError):
            self.contract.raise_dispute(self.tid, "Plate reader baseline blanking was uncalibrated")

    def test_04_referee_dispute_resolution(self):
        """Sponsor stakes 200 GEN bond to dispute -> AI referee rules in favor of Sponsor -> Slashing occurs -> Withdrawable credit created."""
        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(400)
        self.contract.accept_assay_task(self.tid)

        self.gl.nondet.exec_prompt = lambda p, response_format="json": {
            "statistician_vote": "APPROVED",
            "biochemist_vote": "APPROVED",
            "contamination_vote": "APPROVED",
            "verdict": "APPROVED",
            "confidence": 95,
            "reason": "Passed"
        }
        self.contract.submit_assay_telemetry(
            self.tid,
            "https://lab-logs.org/telemetry.csv",
            assay_log_hash=f"sha256:{self.log_hash}"
        )

        # Sponsor raises dispute with sufficient 200 GEN bond (10% of 2000)
        self.gl.message_raw = {"datetime": "2026-08-23T06:00:00+00:00"}
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(200)
        self.contract.raise_dispute(self.tid, "Blanking was uncalibrated")
        self.assertEqual(self.contract.tasks[self.tid].status, "DISPUTED")
        self.assertEqual(self.contract.tasks[self.tid].appeal_bond, 200)

        # AI Referee rules REFUND (Sponsor wins, gets bounty + lab stake + returned appeal bond = 2000 + 400 + 200 = 2600)
        self.gl.nondet.exec_prompt = lambda p, response_format="json": {
            "verdict": "REFUND",
            "reason": "Sponsor dispute is valid: baseline blanking is indeed uncalibrated in the logs."
        }
        self.contract.resolve_dispute_via_referee(self.tid)
        
        self.assertEqual(self.contract.tasks[self.tid].status, "CLOSED")
        self.assertEqual(self.contract.get_withdrawable_balance(self.sponsor), "2600")

        # Sponsor claims credited settlement
        self.gl.message.sender_address = self.sponsor
        self.contract.withdraw_credits()
        self.assertEqual(self.gl.transfers[0]["to"], self.sponsor)
        self.assertEqual(self.gl.transfers[0]["value"], 2600)

    def test_05_evidence_integrity_deterministic_sha256_verification(self):
        """Ensure hash commitment verification passes when hashes match and stores provenance."""
        tid2 = "task_hash_verified_02"
        proto_content = "CRISPR-Cas12a-Protocol-v2-Official"
        computed_proto_hash = hashlib.sha256(proto_content.encode("utf-8")).hexdigest()

        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(1000)
        self.contract.create_assay_task(
            tid2,
            "https://protocols.io/spec/crispr_v2.json",
            "Cas12a Cleavage V2",
            "R^2 > 0.98",
            "Sensor saturation",
            protocol_spec_hash=f"sha256:{computed_proto_hash}"
        )

        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(200)
        self.contract.accept_assay_task(tid2)

        telemetry_content = "Raw-Kinetic-Readings-OD600-0.985"
        computed_log_hash = hashlib.sha256(telemetry_content.encode("utf-8")).hexdigest()

        # Mock render returns exact content
        def mock_render(url, mode="text"):
            if "crispr_v2" in url:
                return proto_content
            return telemetry_content
        self.gl.nondet.web.render = mock_render

        self.gl.nondet.exec_prompt = lambda p, response_format="json": {
            "statistician_vote": "APPROVED",
            "biochemist_vote": "APPROVED",
            "contamination_vote": "APPROVED",
            "verdict": "APPROVED",
            "confidence": 98,
            "reason": "Hash verified and kinetic curves aligned."
        }

        self.contract.submit_assay_telemetry(
            tid2,
            "https://lab.org/telemetry_v2.csv",
            assay_log_hash=f"sha256:{computed_log_hash}",
            lab_provenance_sig="0xSignature123",
            provenance_type="SPECTROMETER_HARDWARE_ATTESTATION",
            instrument_id="Tecan-Infinite-M-Nano-SN9912"
        )

        task = self.contract.tasks[tid2]
        self.assertEqual(task.status, "AWAITING_PAYOUT")
        self.assertEqual(task.verdict, "APPROVED")
        self.assertEqual(task.instrument_id, "Tecan-Infinite-M-Nano-SN9912")

    def test_06_tampered_evidence_rejected_by_python_sha256(self):
        """Code-level SHA-256 verification catches tampered telemetry without relying on LLM."""
        tid3 = "task_tampered_03"
        proto_content = "CRISPR-Cas12a-Protocol-v3"
        correct_proto_hash = hashlib.sha256(proto_content.encode("utf-8")).hexdigest()

        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(1000)
        self.contract.create_assay_task(
            tid3,
            "https://protocols.io/spec/crispr_v3.json",
            "Cas12a Cleavage V3",
            "R^2 > 0.98",
            "Sensor saturation",
            protocol_spec_hash=f"sha256:{correct_proto_hash}"
        )

        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(200)
        self.contract.accept_assay_task(tid3)

        # Lab commits a hash, but web content returns TAMPERED payload!
        committed_log_hash = "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff"
        tampered_telemetry_content = "Tampered-Faked-Readings"

        self.gl.nondet.web.render = lambda url, mode="text": proto_content if "crispr_v3" in url else tampered_telemetry_content

        # Submit telemetry with hash mismatch
        self.contract.submit_assay_telemetry(
            tid3,
            "https://lab.org/tampered.csv",
            assay_log_hash=f"sha256:{committed_log_hash}"
        )

        task = self.contract.tasks[tid3]
        # Should be caught by Python SHA-256 and flagged REFUND
        self.assertEqual(task.verdict, "REFUND")
        self.assertIn("CRITICAL EVIDENCE INTEGRITY VIOLATION", task.reason)
        self.assertIn("hash mismatch", task.reason)

    def test_07_empty_protocol_spec_hash_strictly_reverts(self):
        """Contract strictly rejects task creation if protocol_spec_hash is empty -> MUST REVERT"""
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(1000)
        with self.assertRaises(MockUserError):
            self.contract.create_assay_task(
                "task_empty_hash",
                "https://protocols.io/spec.json",
                "Name",
                "Tol",
                "Ano",
                protocol_spec_hash=""
            )

    def test_08_invalid_protocol_spec_hash_format_reverts(self):
        """Contract strictly rejects task creation if protocol_spec_hash is not 64 hex chars or IPFS -> MUST REVERT"""
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(1000)
        with self.assertRaises(MockUserError):
            self.contract.create_assay_task(
                "task_bad_hash",
                "https://protocols.io/spec.json",
                "Name",
                "Tol",
                "Ano",
                protocol_spec_hash="sha256:1234_too_short"
            )

    def test_09_empty_telemetry_hash_strictly_reverts(self):
        """Contract strictly rejects telemetry submission if assay_log_hash is empty in standard mode -> MUST REVERT"""
        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(400)
        self.contract.accept_assay_task(self.tid)

        with self.assertRaises(MockUserError):
            self.contract.submit_assay_telemetry(
                self.tid,
                "https://lab.org/log.csv",
                assay_log_hash=""
            )

    def test_10_protocol_spec_hash_mismatch_triggers_escalate(self):
        """When rendered protocol web content drifts from committed SHA-256 snapshot -> ESCALATE with 100% confidence"""
        tid4 = "task_drifted_proto"
        real_content = "Original Protocol Specification"
        drifted_content = "Attacker Modified Protocol Specification"
        original_hash = hashlib.sha256(real_content.encode("utf-8")).hexdigest()

        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(1000)
        self.contract.create_assay_task(
            tid4,
            "https://protocols.io/spec/mutable.json",
            "Assay",
            "Tol",
            "Ano",
            protocol_spec_hash=f"sha256:{original_hash}"
        )

        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(200)
        self.contract.accept_assay_task(tid4)

        # Web server returns drifted/modified content!
        self.gl.nondet.web.render = lambda url, mode="text": drifted_content if "mutable" in url else self.log_content

        self.contract.submit_assay_telemetry(
            tid4,
            "https://lab.org/log.csv",
            assay_log_hash=f"sha256:{self.log_hash}"
        )

        task = self.contract.tasks[tid4]
        self.assertEqual(task.status, "ESCALATED")
        self.assertEqual(task.verdict, "ESCALATE")
        self.assertEqual(task.confidence, 100)
        self.assertIn("CRITICAL EVIDENCE INTEGRITY VIOLATION", task.reason)
        self.assertIn("Mutable content drift detected", task.reason)

    def test_11_ipfs_cid_validation_and_url_binding(self):
        """IPFS model must validate CID syntax and strictly enforce URL binding to committed CID"""
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(1000)

        # 1. Invalid CID format (too short / bad chars) MUST REVERT
        with self.assertRaises(MockUserError):
            self.contract.create_assay_task(
                "task_bad_cid",
                "ipfs://QmTooShort",
                "Assay", "Tol", "Ano",
                protocol_spec_hash="ipfs://QmTooShort"
            )

        # 2. Valid CID but unbound mutable HTTP URL MUST REVERT with URL binding violation
        valid_cid = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
        with self.assertRaises(MockUserError):
            self.contract.create_assay_task(
                "task_unbound_url",
                "https://mutable-website.com/spec.json",  # does not contain CID!
                "Assay", "Tol", "Ano",
                protocol_spec_hash=f"ipfs://{valid_cid}"
            )

        # 3. Valid CID and properly bound IPFS gateway URL MUST SUCCEED
        self.contract.create_assay_task(
            "task_valid_ipfs",
            f"https://ipfs.io/ipfs/{valid_cid}",
            "Assay", "Tol", "Ano",
            protocol_spec_hash=f"ipfs://{valid_cid}"
        )
        self.assertIn("task_valid_ipfs", self.contract.tasks)
        self.assertEqual(self.contract.tasks["task_valid_ipfs"].protocol_spec_hash, f"ipfs://{valid_cid}")

    def test_12_evidence_drift_during_dispute_resolution_refuses_evaluation(self):
        """During dispute resolution, if evidence bytes drift from committed snapshot -> referee halts immediately without LLM eval"""
        tid_disp = "task_dispute_drift"
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
        self.gl.message.value = MockBigInt(100) # 10% appeal bond
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

    def test_13_validator_disagreement_consensus_failure(self):
        """Direct Mode / Studio test: Equivalence Principle divergence between leader and validator triggers consensus disagreement"""
        tid_neq = "task_consensus_divergence"
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

    def test_14_withdrawal_settlement_pull_pattern(self):
        """Direct Mode / Studio test: Pull-over-Push safe withdrawal settlement ledger"""
        # Set withdrawable balance for sponsor
        test_user = MockAddress("0xwithdrawer_user")
        self.contract._credit_balance(test_user, MockBigInt(500))
        self.assertEqual(self.contract.get_withdrawable_balance(test_user), "500")

        # Withdraw credits successfully
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
