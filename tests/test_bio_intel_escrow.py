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

        # Sponsor creates bounty with 2000 GEN escrow
        self.tid = "assay_crispr_kinetic_01"
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(2000)
        self.contract.create_assay_task(
            self.tid,
            "https://protocols.io/spec/crispr_cleavage.json",
            "CRISPR Cas12a Cleavage Kinetic Replication Assay",
            "p-value < 0.01, R^2 > 0.98, CV < 5%",
            "Negative control cleaved, baseline drift > 10%",
            protocol_spec_hash=""
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

        self.gl.nondet.web.render = lambda url, mode="text": "Mocked spectrometry data R^2=0.994, p=0.0005"
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
            assay_log_hash="",
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

        self.gl.nondet.web.render = lambda url, mode="text": "Spectrometry data"
        self.gl.nondet.exec_prompt = lambda p, response_format="json": {
            "statistician_vote": "APPROVED",
            "biochemist_vote": "APPROVED",
            "contamination_vote": "APPROVED",
            "verdict": "APPROVED",
            "confidence": 95,
            "reason": "Passed"
        }
        self.contract.submit_assay_telemetry(self.tid, "https://lab-logs.org/telemetry.csv")

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

        self.gl.nondet.web.render = lambda url, mode="text": "Spectrometry data"
        self.gl.nondet.exec_prompt = lambda p, response_format="json": {
            "statistician_vote": "APPROVED",
            "biochemist_vote": "APPROVED",
            "contamination_vote": "APPROVED",
            "verdict": "APPROVED",
            "confidence": 95,
            "reason": "Passed"
        }
        self.contract.submit_assay_telemetry(self.tid, "https://lab-logs.org/telemetry.csv")

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
        self.assertIn("Assay log hash mismatch", task.reason)

if __name__ == "__main__":
    unittest.main(verbosity=2)
