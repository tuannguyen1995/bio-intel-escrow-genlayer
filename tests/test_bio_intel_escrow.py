import sys
import os
import unittest
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
        self.contract.platform_admin = self.admin.lower()

        # Sponsor creates bounty with 2000 GEN escrow
        self.tid = "assay_crispr_kinetic_01"
        self.gl.message.sender_address = self.sponsor
        self.gl.message.value = MockBigInt(2000)
        self.contract.create_assay_task(
            self.tid,
            "https://protocols.io/spec/crispr_cleavage.json",
            "Cas12a Cleavage Kinetic Replication Assay",
            "p-value < 0.01, R^2 > 0.98, CV < 5%",
            "Negative control cleaved, sensor saturation, reagent degradation"
        )

    def test_01_under_staking_reverts(self):
        """Lab attempts to deposit < 20% stake (399 < 400) -> MUST REVERT"""
        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(399)
        with self.assertRaises(MockUserError):
            self.contract.accept_assay_task(self.tid)

    def test_02_valid_telemetry_approved_and_cooling_off(self):
        """Telemetry approved -> 24h delay enforced before 2400 GEN (2000 + 400 stake) release."""
        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(400)
        self.contract.accept_assay_task(self.tid)

        self.gl.nondet.web.render = lambda url, mode="text": "Validated OD600 and Fluorescence telemetry"
        self.gl.nondet.exec_prompt = lambda p, response_format="json": {
            "verdict": "APPROVED", "confidence": 99, "reason": "R^2=0.994, p<0.001, negative controls intact"
        }

        self.contract.submit_assay_telemetry(self.tid, "https://lab-logs.org/telemetry_01.csv")
        self.assertEqual(self.contract.tasks[self.tid].status, "AWAITING_PAYOUT")

        # Early finalization attempt -> REVERT
        self.gl.message_raw = {"datetime": "2026-08-23T12:00:00+00:00"}
        with self.assertRaises(MockUserError):
            self.contract.finalize_payout(self.tid)

        # Finalization at T+24h01m -> SUCCEEDS
        self.gl.message_raw = {"datetime": "2026-08-24T00:01:00+00:00"}
        self.contract.finalize_payout(self.tid)
        self.assertEqual(self.contract.tasks[self.tid].status, "CLOSED")
        self.assertEqual(self.gl.transfers[0]["to"], self.lab)
        self.assertEqual(self.gl.transfers[0]["value"], 2400)

    def test_03_dispute_flow_and_arbitration(self):
        """Sponsor raises dispute -> transitions to DISPUTED and blocks payout."""
        self.gl.message.sender_address = self.lab
        self.gl.message.value = MockBigInt(400)
        self.contract.accept_assay_task(self.tid)

        self.gl.nondet.web.render = lambda url, mode="text": "Spectrometry data"
        self.gl.nondet.exec_prompt = lambda p, response_format="json": {"verdict": "APPROVED", "confidence": 95, "reason": "Passed"}
        self.contract.submit_assay_telemetry(self.tid, "https://lab-logs.org/telemetry.csv")

        # Sponsor raises dispute at T+6h
        self.gl.message_raw = {"datetime": "2026-08-23T06:00:00+00:00"}
        self.gl.message.sender_address = self.sponsor
        self.contract.raise_dispute(self.tid, "Plate reader baseline blanking was uncalibrated")
        self.assertEqual(self.contract.tasks[self.tid].status, "DISPUTED")

        # Payout blocked
        self.gl.message_raw = {"datetime": "2026-08-24T02:00:00+00:00"}
        self.gl.message.sender_address = self.lab
        with self.assertRaises(MockUserError):
            self.contract.finalize_payout(self.tid)

        # Admin resolves with SPLIT
        self.gl.message.sender_address = self.admin
        self.contract.resolve_escalation(self.tid, "SPLIT")
        self.assertEqual(self.contract.tasks[self.tid].status, "CLOSED")
        self.assertEqual(len(self.gl.transfers), 2)
        self.assertEqual(self.gl.transfers[0]["to"], self.lab)
        self.assertEqual(self.gl.transfers[0]["value"], 1400) # 1000 half + 400 stake
        self.assertEqual(self.gl.transfers[1]["to"], self.sponsor)
        self.assertEqual(self.gl.transfers[1]["value"], 1000)

if __name__ == "__main__":
    unittest.main(verbosity=2)
