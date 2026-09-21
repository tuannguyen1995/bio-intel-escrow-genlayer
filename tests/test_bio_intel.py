"""
Official GenLayer Direct Mode Consensus Test Suite.
Tests intelligent contract execution in-memory via gltest.direct.

Mandatory Scenarios:
1. test_evidence_drift_during_dispute: Referee refuses to evaluate tampered web/IPFS data -> REFUND.
2. test_validator_disagreement: Equivalence Principle divergence between leader and validator.
3. test_withdrawal_settlement: Pull-over-push withdraw_credits settlement with native bigint.
4. test_under_staking_reverts: Lab deposit < 20% stake strictly reverts.
5. test_ipfs_cid_validation_and_url_binding: CIDv0/v1 format validation and URL binding.
"""

import json
import hashlib
from pathlib import Path
import pytest
from gltest.direct.vm import VMContext
from gltest.direct.loader import deploy_contract, create_address

CONTRACT_PATH = Path(__file__).resolve().parent.parent / "contracts" / "BioIntelEscrow.py"


@pytest.fixture
def vm_env():
    """Initializes a fresh GenLayer VMContext with test actors."""
    vm = VMContext()
    admin = create_address("admin")
    sponsor = create_address("sponsor")
    lab = create_address("lab")
    vm.sender = admin

    with vm.activate():
        contract = deploy_contract(CONTRACT_PATH, vm)
        yield {
            "vm": vm,
            "contract": contract,
            "admin": admin,
            "sponsor": sponsor,
            "lab": lab,
        }


def test_evidence_drift_during_dispute(vm_env):
    """
    Test Case 1: Evidence drift during dispute resolution.
    If the web/IPFS content drifts from committed SHA-256 snapshot, the referee
    halts immediately, upholding the dispute without executing LLM on tampered bytes.
    """
    vm = vm_env["vm"]
    c = vm_env["contract"]
    sponsor = vm_env["sponsor"]
    lab = vm_env["lab"]

    proto_content = "Cas12a Cleavage Kinetic Replication Specification Standard v1.0"
    proto_hash = hashlib.sha256(proto_content.encode("utf-8")).hexdigest()
    log_content = "Spectrometry data R^2=0.994, p=0.0005, CV=3.2%"
    log_hash = hashlib.sha256(log_content.encode("utf-8")).hexdigest()

    # Initial web & LLM mocks
    vm.mock_web(".*protocols.*", {"method": "GET", "status": 200, "body": proto_content})
    vm.mock_web(".*telemetry.*", {"method": "GET", "status": 200, "body": log_content})
    vm.mock_llm(".*", json.dumps({
        "statistician_vote": "APPROVED", "biochemist_vote": "APPROVED", "contamination_vote": "APPROVED",
        "verdict": "APPROVED", "confidence": 99, "reason": "Passed initial assay"
    }))

    # 1. Sponsor creates assay task with 2000 GEN bounty
    vm.sender = sponsor
    vm.value = 2000
    c.create_assay_task(
        "assay_drift_01",
        "https://protocols.io/spec.json",
        "CRISPR Cas12a Cleavage Kinetic Replication Assay",
        "p-value < 0.01, R^2 > 0.98, CV < 5%",
        "Negative control cleaved, baseline drift > 10%",
        protocol_spec_hash=f"sha256:{proto_hash}"
    )

    # 2. Lab deposits 20% stake (400 GEN) and accepts
    vm.sender = lab
    vm.value = 400
    c.accept_assay_task("assay_drift_01")

    # 3. Lab submits telemetry matching committed hash
    vm.sender = lab
    vm.value = 0
    c.submit_assay_telemetry(
        "assay_drift_01",
        "https://lab-logs.org/telemetry.csv",
        False, "",
        f"sha256:{log_hash}",
        "0xsig", "LAB_EQUIPMENT_METADATA", "Biotek-H1"
    )

    t_submitted = json.loads(c.get_all_tasks())[0]
    assert t_submitted["status"] == "AWAITING_PAYOUT"

    # 4. Sponsor raises dispute within cooling-off period (10% appeal bond = 200 GEN)
    vm.sender = sponsor
    vm.value = 200
    c.raise_dispute("assay_drift_01", "Suspected baseline blanking drift in run logs")

    t_disputed = json.loads(c.get_all_tasks())[0]
    assert t_disputed["status"] == "DISPUTED"

    # 5. EVIDENCE DRIFT OCCURS: Telemetry URL content is tampered post-dispute!
    vm._web_mocks.clear()
    vm.mock_web(".*protocols.*", {"method": "GET", "status": 200, "body": proto_content})
    vm.mock_web(".*telemetry.*", {"method": "GET", "status": 200, "body": "TAMPERED PAYLOAD INJECTED POST DISPUTE"})

    # 6. Referee resolves dispute: detects drift and upholds dispute immediately
    c.resolve_dispute_via_referee("assay_drift_01")

    t_final = json.loads(c.get_all_tasks())[0]
    assert t_final["status"] == "CLOSED"
    assert "CRITICAL EVIDENCE INTEGRITY VIOLATION DURING DISPUTE" in t_final["reason"]

    # Sponsor is refunded full bounty + lab stake + returned appeal bond in withdrawable_balances
    sponsor_str = t_final["sponsor"]
    bal = c.get_withdrawable_balance(sponsor_str)
    assert int(bal) == 2600  # 2000 bounty + 400 forfeited lab stake + 200 returned bond


def test_validator_disagreement(vm_env):
    """
    Test Case 2: Validator disagreement under GenLayer Equivalence Principle.
    When leader and validator diverge during non-deterministic evaluation,
    consensus fails and the validator function returns False.
    """
    vm = vm_env["vm"]
    c = vm_env["contract"]
    sponsor = vm_env["sponsor"]
    lab = vm_env["lab"]

    proto_content = "CRISPR Replication Protocol Standard v1"
    proto_hash = hashlib.sha256(proto_content.encode("utf-8")).hexdigest()
    log_content = "Spectrometry curves 0.992"
    log_hash = hashlib.sha256(log_content.encode("utf-8")).hexdigest()

    vm.mock_web(".*protocols.*", {"method": "GET", "status": 200, "body": proto_content})
    vm.mock_web(".*telemetry.*", {"method": "GET", "status": 200, "body": log_content})

    # Leader votes APPROVED
    vm.mock_llm(".*", json.dumps({
        "statistician_vote": "APPROVED", "biochemist_vote": "APPROVED", "contamination_vote": "APPROVED",
        "verdict": "APPROVED", "confidence": 95, "reason": "Leader says pass"
    }))

    vm.sender = sponsor
    vm.value = 1000
    c.create_assay_task(
        "task_consensus_divergence",
        "https://protocols.io/spec.json",
        "Assay", "Tol", "Ano",
        protocol_spec_hash=f"sha256:{proto_hash}"
    )

    vm.sender = lab
    vm.value = 200
    c.accept_assay_task("task_consensus_divergence")

    # Lab submits telemetry: Leader executes and passes
    vm.sender = lab
    vm.value = 0
    c.submit_assay_telemetry(
        "task_consensus_divergence",
        "https://lab-logs.org/telemetry.csv",
        False, "",
        f"sha256:{log_hash}"
    )

    # When validator re-executes with same mock -> agrees (True)
    assert vm.run_validator() is True

    # Now swap LLM mock so Validator re-execution produces a divergent verdict (REFUND)
    vm._llm_mocks.clear()
    vm.mock_llm(".*", json.dumps({
        "statistician_vote": "REFUND", "biochemist_vote": "REFUND", "contamination_vote": "REFUND",
        "verdict": "REFUND", "confidence": 90, "reason": "Validator says fail"
    }))

    # Equivalence Principle check fails -> Validator disagreement proven!
    assert vm.run_validator() is False


def test_withdrawal_settlement(vm_env):
    """
    Test Case 3: Withdrawal settlement pull pattern.
    Safe pull-over-push settlement with native bigint value via emit_transfer.
    """
    vm = vm_env["vm"]
    c = vm_env["contract"]
    user = create_address("withdrawer_user")
    user_hex = "0x" + bytes(user).hex() if isinstance(user, bytes) else str(user).lower()

    # Credit balance to user
    c._credit_balance(user_hex, 750)
    assert c.get_withdrawable_balance(user_hex) == "750"

    # User calls withdraw_credits() successfully
    vm.sender = user
    c.withdraw_credits()

    # Balance reset to zero
    assert c.get_withdrawable_balance(user_hex) == "0"

    # Subsequent withdrawal must revert because balance is zero
    with pytest.raises(Exception) as exc_info:
        c.withdraw_credits()
    assert "No withdrawable balance available" in str(exc_info.value)


def test_under_staking_reverts(vm_env):
    """Test Case 4: Lab deposit < 20% stake strictly reverts."""
    vm = vm_env["vm"]
    c = vm_env["contract"]
    sponsor = vm_env["sponsor"]
    lab = vm_env["lab"]

    proto_content = "Cas12a Spec"
    proto_hash = hashlib.sha256(proto_content.encode()).hexdigest()

    vm.sender = sponsor
    vm.value = 2000
    c.create_assay_task("task_stake_test", "https://p.io/spec.json", "Name", "Tol", "Ano", protocol_spec_hash=f"sha256:{proto_hash}")

    # Required stake is 400 (20% of 2000). Deposit 399 -> must revert
    vm.sender = lab
    vm.value = 399
    with pytest.raises(Exception) as exc_info:
        c.accept_assay_task("task_stake_test")
    assert "Insufficient lab stake" in str(exc_info.value)


def test_ipfs_cid_validation_and_url_binding(vm_env):
    """Test Case 5: IPFS CID format validation and URL binding enforcement."""
    vm = vm_env["vm"]
    c = vm_env["contract"]
    sponsor = vm_env["sponsor"]

    vm.sender = sponsor
    vm.value = 1000

    # 1. Invalid CID format (too short) strictly reverts
    with pytest.raises(Exception) as exc_info:
        c.create_assay_task("t_bad_cid", "ipfs://QmTooShort", "N", "T", "A", protocol_spec_hash="ipfs://QmTooShort")
    assert "Invalid IPFS CID format" in str(exc_info.value)

    # 2. Valid CID but unbound URL strictly reverts
    valid_cid = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
    with pytest.raises(Exception) as exc_info:
        c.create_assay_task("t_unbound", "https://unbound-site.com/spec.json", "N", "T", "A", protocol_spec_hash=f"ipfs://{valid_cid}")
    assert "URL binding violation" in str(exc_info.value)

    # 3. Valid CID and bound IPFS URL succeeds
    c.create_assay_task("t_valid_ipfs", f"https://ipfs.io/ipfs/{valid_cid}", "N", "T", "A", protocol_spec_hash=f"ipfs://{valid_cid}")
    assert "t_valid_ipfs" in c.tasks
    assert c.tasks["t_valid_ipfs"].protocol_spec_hash == f"ipfs://{valid_cid}"
