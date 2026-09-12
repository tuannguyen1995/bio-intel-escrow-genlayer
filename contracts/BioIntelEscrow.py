# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json
import hashlib

@allow_storage
@dataclass
class AssayTask:
    sponsor: str
    lab: str
    escrow_amount: bigint
    lab_stake: bigint
    appeal_bond: bigint
    status: str            # OPEN, IN_PROGRESS, AWAITING_PAYOUT, NEEDS_REVISION, DISPUTED, ESCALATED, CLOSED
    protocol_url: str
    protocol_spec_hash: str   # Evidence integrity: immutable hash commitment (SHA-256 / IPFS CID)
    assay_log_url: str
    assay_log_hash: str       # Evidence integrity: immutable hash of telemetry data (SHA-256 / IPFS CID)
    assay_name: str
    tolerance_criteria: str
    blacklist_anomalies: str
    verdict: str           # APPROVED, PARTIAL, REFUND, ESCALATE
    reason: str
    confidence: bigint
    attempts: bigint
    payout_ready_at: bigint
    disputed_at: bigint
    is_zk_mode: bool
    zk_proof_hash: str
    lab_provenance_sig: str   # Provenance: cryptographic signature from lab key / instrument
    provenance_type: str      # Provenance: LIMS_RAW_EXPORT, SPECTROMETER_HARDWARE_ATTESTATION, CERTIFIED_LAB_SIG
    instrument_id: str        # Provenance: Instrument hardware model & serial number

class Contract(gl.Contract):
    platform_admin: str
    tasks: TreeMap[str, AssayTask]
    task_ids: DynArray[str]
    withdrawable_balances: TreeMap[str, bigint]  # Settlement: Pull-over-Push escrow recovery vault

    def __init__(self):
        self.platform_admin = str(gl.message.sender_address).lower()
        if not hasattr(self, "withdrawable_balances") or self.withdrawable_balances is None:
            self.withdrawable_balances = TreeMap()
        if not hasattr(self, "tasks") or self.tasks is None:
            self.tasks = TreeMap()
        if not hasattr(self, "task_ids") or self.task_ids is None:
            self.task_ids = DynArray()

    def _credit_balance(self, recipient: str, amount: bigint) -> None:
        rec = str(recipient).lower()
        curr = self.withdrawable_balances.get(rec, bigint(0))
        self.withdrawable_balances[rec] = curr + amount

    def _get_current_timestamp(self) -> bigint:
        dt_raw = gl.message_raw.get("datetime", None) if isinstance(gl.message_raw, dict) else None
        if not dt_raw:
            raise UserError("Trusted execution timestamp missing from transaction context")
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(str(dt_raw).replace("Z", "+00:00"))
            ts = int(dt.timestamp())
            if ts > 0:
                return bigint(ts)
        except Exception as e:
            raise UserError(f"Failed to parse trusted execution timestamp: {str(e)}")
        raise UserError("Invalid execution timestamp in transaction context")

    def _parse_llm_json(self, response_str: str) -> dict:
        if isinstance(response_str, dict):
            return response_str
        if hasattr(response_str, "__dict__"):
            return response_str.__dict__
        t = str(response_str).strip()
        if t.startswith("```json"):
            t = t[7:]
        elif t.startswith("```"):
            t = t[3:]
        if t.endswith("```"):
            t = t[:-3]
        try:
            return json.loads(t.strip())
        except Exception as e:
            return {
                "verdict": "ESCALATE",
                "confidence": 0,
                "reason": f"JSON parse failure: {str(e)}",
                "statistician_vote": "ESCALATE",
                "biochemist_vote": "ESCALATE",
                "contamination_vote": "ESCALATE"
            }

    def _effective_verdict(self, data: dict) -> str:
        verdict = str(data.get("verdict", "ESCALATE")).upper().strip()
        if verdict not in {"APPROVED", "PARTIAL", "REFUND", "ESCALATE"}:
            verdict = "ESCALATE"
        try:
            conf = int(data.get("confidence", 0))
        except Exception:
            conf = 0
        if conf < 65:
            verdict = "ESCALATE"
        return verdict

    @gl.public.write
    def withdraw_credits(self) -> None:
        """PULL settlement pattern: Allows beneficiaries to withdraw their settled payouts or refunds safely."""
        caller = str(gl.message.sender_address).lower()
        bal = self.withdrawable_balances.get(caller, bigint(0))
        if bal <= bigint(0):
            raise UserError("No withdrawable balance available")
        self.withdrawable_balances[caller] = bigint(0)
        gl.get_contract_at(Address(caller)).emit_transfer(value=u256(bal))

    @gl.public.view
    def get_withdrawable_balance(self, account: str) -> str:
        """View method to inspect pending withdrawable credit balance."""
        acc = str(account).lower()
        bal = self.withdrawable_balances.get(acc, bigint(0))
        return str(bal)

    @gl.public.write.payable
    def create_assay_task(
        self,
        task_id: str,
        protocol_url: str,
        assay_name: str,
        tolerance_criteria: str,
        blacklist_anomalies: str,
        protocol_spec_hash: str
    ) -> None:
        if task_id in self.tasks:
            raise UserError(f"Assay task ID {task_id} already exists")
        
        escrow_amt = gl.message.value
        if escrow_amt <= bigint(0):
            raise UserError("Escrow bounty must be strictly positive")
        if not protocol_url.startswith("http") and not protocol_url.startswith("ipfs://"):
            raise UserError("Valid protocol specification HTTP/HTTPS or IPFS URL required")

        # Mandatory Immutable Evidence Anchoring:
        # A committed content snapshot digest (SHA-256 or IPFS CID) is strictly required.
        clean_spec_hash = protocol_spec_hash.strip()
        if not clean_spec_hash:
            raise UserError("Mandatory evidence anchoring: protocol_spec_hash cannot be empty. An immutable SHA-256 digest or IPFS CID snapshot commitment is strictly required.")
        if not clean_spec_hash.startswith("ipfs://"):
            normalized_spec_hash = clean_spec_hash.lower().replace("sha256:", "").strip()
            if len(normalized_spec_hash) != 64 or not all(c in "0123456789abcdef" for c in normalized_spec_hash):
                raise UserError("Protocol specification hash must be a valid 64-character SHA-256 hexadecimal digest or IPFS CID.")

        caller = str(gl.message.sender_address).lower()
        
        self.tasks[task_id] = AssayTask(
            sponsor=caller,
            lab="0x0000000000000000000000000000000000000000",
            escrow_amount=escrow_amt,
            lab_stake=bigint(0),
            appeal_bond=bigint(0),
            status="OPEN",
            protocol_url=protocol_url.strip(),
            protocol_spec_hash=clean_spec_hash,
            assay_log_url="",
            assay_log_hash="",
            assay_name=assay_name.strip(),
            tolerance_criteria=tolerance_criteria.strip(),
            blacklist_anomalies=blacklist_anomalies.strip(),
            verdict="NONE",
            reason="Awaiting replication lab acceptance",
            confidence=bigint(0),
            attempts=bigint(0),
            payout_ready_at=bigint(0),
            disputed_at=bigint(0),
            is_zk_mode=False,
            zk_proof_hash="",
            lab_provenance_sig="",
            provenance_type="STANDARD_EXPORT",
            instrument_id=""
        )
        self.task_ids.append(task_id)

    @gl.public.write.payable
    def accept_assay_task(self, task_id: str) -> None:
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status != "OPEN":
            raise UserError("Task is not in OPEN status")

        caller = str(gl.message.sender_address).lower()
        if caller == task.sponsor:
            raise UserError("Sponsor cannot replicate their own assay")

        min_stake = task.escrow_amount // bigint(5)
        if gl.message.value < min_stake or gl.message.value <= bigint(0):
            raise UserError(f"Insufficient lab stake. Minimum 20% required ({min_stake})")

        task.lab = caller
        task.lab_stake = gl.message.value
        task.status = "IN_PROGRESS"
        self.tasks[task_id] = task

    @gl.public.write
    def submit_assay_telemetry(
        self,
        task_id: str,
        assay_log_url: str,
        is_zk_mode: bool = False,
        zk_proof_hash: str = "",
        assay_log_hash: str = "",
        lab_provenance_sig: str = "",
        provenance_type: str = "LIMS_RAW_EXPORT",
        instrument_id: str = ""
    ) -> None:
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        caller = str(gl.message.sender_address).lower()
        
        if caller != task.lab:
            raise UserError("Only the designated replication lab can submit telemetry")
        if task.status not in ["IN_PROGRESS", "NEEDS_REVISION"]:
            raise UserError("Task is not ready for telemetry submission")
        
        # Mandatory Immutable Evidence Anchoring:
        clean_zk_hash = zk_proof_hash.strip()
        clean_log_hash = assay_log_hash.strip()

        if is_zk_mode:
            if not clean_zk_hash:
                raise UserError("Mandatory evidence anchoring: zk_proof_hash is strictly required in ZK compliance mode.")
        else:
            if not assay_log_url.startswith("http") and not assay_log_url.startswith("ipfs://"):
                raise UserError("Valid telemetry log HTTP/HTTPS or IPFS URL required in standard mode")
            if not clean_log_hash:
                raise UserError("Mandatory evidence anchoring: assay_log_hash cannot be empty. An immutable SHA-256 digest or IPFS CID snapshot commitment is strictly required.")
            if not clean_log_hash.startswith("ipfs://"):
                normalized_log_hash = clean_log_hash.lower().replace("sha256:", "").strip()
                if len(normalized_log_hash) != 64 or not all(c in "0123456789abcdef" for c in normalized_log_hash):
                    raise UserError("Assay telemetry log hash must be a valid 64-character SHA-256 hexadecimal digest or IPFS CID.")

        task.assay_log_url = assay_log_url.strip()
        task.assay_log_hash = clean_log_hash
        task.is_zk_mode = is_zk_mode
        task.zk_proof_hash = clean_zk_hash
        task.lab_provenance_sig = lab_provenance_sig.strip()
        task.provenance_type = provenance_type.strip()
        task.instrument_id = instrument_id.strip()
        task.attempts += bigint(1)
        
        proto_str = task.protocol_url
        proto_hash = task.protocol_spec_hash
        log_str = task.assay_log_url
        log_hash = task.assay_log_hash
        name_str = task.assay_name
        tol_str = task.tolerance_criteria
        ano_str = task.blacklist_anomalies
        prov_type = task.provenance_type
        inst_id = task.instrument_id
        lab_sig = task.lab_provenance_sig

        def leader_fn() -> dict:
            try:
                p_res = gl.nondet.web.render(proto_str, mode="text")
                p_text = str(p_res)
                if any(err in p_text[:400].lower() for err in ["404 not found", "error 404", "not found"]):
                    return {
                        "verdict": "ESCALATE", "confidence": 100, 
                        "statistician_vote": "ESCALATE", "biochemist_vote": "ESCALATE", "contamination_vote": "ESCALATE",
                        "reason": "Baseline protocol URL is 404; escrow held to protect replication lab against rugpull."
                    }
            except Exception as e:
                return {
                    "verdict": "ESCALATE", "confidence": 100, 
                    "statistician_vote": "ESCALATE", "biochemist_vote": "ESCALATE", "contamination_vote": "ESCALATE",
                    "reason": f"Protocol fetch failed: {str(e)}"
                }

            # Mandatory Cryptographic Evidence Integrity Check: Protocol Specification
            if not proto_hash.startswith("ipfs://"):
                clean_proto = proto_hash.lower().replace("sha256:", "").strip()
                computed_proto = hashlib.sha256(p_text.encode("utf-8")).hexdigest().lower()
                if computed_proto != clean_proto:
                    return {
                        "verdict": "ESCALATE", "confidence": 100, 
                        "statistician_vote": "ESCALATE", "biochemist_vote": "ESCALATE", "contamination_vote": "ESCALATE",
                        "reason": f"CRITICAL EVIDENCE INTEGRITY VIOLATION: Protocol spec hash mismatch! Expected committed snapshot {clean_proto}, got rendered content {computed_proto}. Mutable URL drift detected."
                    }

            l_text = ""
            if not is_zk_mode:
                try:
                    l_res = gl.nondet.web.render(log_str, mode="text")
                    l_text = str(l_res)
                    if any(err in l_text[:400].lower() for err in ["404 not found", "error 404", "not found"]):
                        return {
                            "verdict": "REFUND", "confidence": 100, 
                            "statistician_vote": "REFUND", "biochemist_vote": "REFUND", "contamination_vote": "REFUND",
                            "reason": "Assay log URL is 404 or empty."
                        }
                except Exception as e:
                    return {
                        "verdict": "REFUND", "confidence": 100, 
                        "statistician_vote": "REFUND", "biochemist_vote": "REFUND", "contamination_vote": "REFUND",
                        "reason": f"Telemetry log fetch failed: {str(e)}"
                    }

                # Mandatory Cryptographic Evidence Integrity Check: Telemetry Data
                if not log_hash.startswith("ipfs://"):
                    clean_log = log_hash.lower().replace("sha256:", "").strip()
                    computed_log = hashlib.sha256(l_text.encode("utf-8")).hexdigest().lower()
                    if computed_log != clean_log:
                        return {
                            "verdict": "REFUND", "confidence": 100, 
                            "statistician_vote": "REFUND", "biochemist_vote": "REFUND", "contamination_vote": "REFUND",
                            "reason": f"CRITICAL EVIDENCE INTEGRITY VIOLATION: Assay log hash mismatch! Expected committed snapshot {clean_log}, got rendered content {computed_log}. Telemetry tampering detected."
                        }
            else:
                l_text = f"ZK Shielded Mode Active. Telemetry Hash: {zk_proof_hash}. Zero-Knowledge proof compliance validated off-chain."

            prompt = f"""
You are a Multi-Agent AI Scientific Board on GenLayer evaluating replication evidence.
Evaluate the biomolecular assay replication evidence against the baseline protocol specifications.

ASSAY TITLE:
{name_str}

BASELINE PROTOCOL SPECIFICATION:
{p_text}

EVIDENCE INTEGRITY & IMMUTABLE HASH COMMITMENTS:
- Baseline Protocol Hash Committed by Sponsor: {proto_hash if proto_hash else 'NOT_COMMITTED'}
- Telemetry Data Hash Committed by Lab: {log_hash if log_hash else 'NOT_COMMITTED'}

LABORATORY PROVENANCE & INSTRUMENT ATTESTATION:
- Provenance Type: {prov_type}
- Instrument Model / ID: {inst_id if inst_id else 'UNSPECIFIED_DEVICE'}
- Certified Lab Attestation Signature: {lab_sig if lab_sig else 'NONE'}

STATISTICAL TOLERANCE CRITERIA:
{tol_str}

BLACKLISTED ANOMALIES:
{ano_str}

TELEMETRY DATA / LOGS:
{l_text}

Please conduct an independent Peer-Review with 3 distinct scientific agent personas:
1. STATISTICIAN AGENT: Evaluates R^2 linearity (>0.98), p-value significance (<0.01), CV (<5%), and kinetic curve fidelity.
2. BIOCHEMIST EXPERT AGENT: Evaluates reagent stoichiometry, assay calibration, and laboratory methodology.
3. CONTAMINATION GUARD AGENT: Evaluates negative control channels, cross-contamination, and baseline blanking.

EVALUATION RULES:
- If evidence integrity hash mismatch or tampering is suspected, vote ESCALATE with confidence 100.
- If lab provenance attestation is missing or invalid, flag in reasoning.
- Each agent must vote: APPROVED, PARTIAL, REFUND, or ESCALATE.
- Overall verdict is the majority vote (at least 2 out of 3 agents agreeing).

Respond ONLY with valid JSON:
{{
  "statistician_vote": "APPROVED|PARTIAL|REFUND|ESCALATE",
  "biochemist_vote": "APPROVED|PARTIAL|REFUND|ESCALATE",
  "contamination_vote": "APPROVED|PARTIAL|REFUND|ESCALATE",
  "verdict": "APPROVED|PARTIAL|REFUND|ESCALATE",
  "confidence": 0-100,
  "reason": "Detailed multi-agent peer-review review summary assessing statistical, biochemical, contamination, and provenance integrity."
}}
"""
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            return self._parse_llm_json(str(res))

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader_data = leader_res.calldata if hasattr(leader_res, "calldata") else leader_res
            if not isinstance(leader_data, dict):
                leader_data = self._parse_llm_json(str(leader_data))

            mine_data = leader_fn()
            return self._effective_verdict(leader_data) == self._effective_verdict(mine_data)

        result = gl.vm.run_nondet(leader_fn, validator_fn)
        if not isinstance(result, dict):
            result = self._parse_llm_json(str(result))

        final_verdict = self._effective_verdict(result)
        try:
            conf = int(result.get("confidence", 0))
        except Exception:
            conf = 0
        
        stat_vote = str(result.get("statistician_vote", "ESCALATE")).upper()
        bio_vote = str(result.get("biochemist_vote", "ESCALATE")).upper()
        cont_vote = str(result.get("contamination_vote", "ESCALATE")).upper()
        reason = f"[Statistician: {stat_vote} | Biochemist: {bio_vote} | Contamination Guard: {cont_vote}] " + str(result.get("reason", "No reason provided"))

        if conf < 65:
            reason = f"[Confidence {conf}% < 65%] " + reason

        task.verdict = final_verdict
        task.reason = reason
        task.confidence = bigint(conf)

        if final_verdict in ["APPROVED", "PARTIAL"]:
            task.status = "AWAITING_PAYOUT"
            task.payout_ready_at = self._get_current_timestamp() + bigint(86400)
        elif final_verdict == "REFUND":
            if task.attempts < bigint(2):
                task.status = "NEEDS_REVISION"
            else:
                task.status = "CLOSED"
                total_refund = task.escrow_amount + task.lab_stake
                task.escrow_amount = bigint(0)
                task.lab_stake = bigint(0)
                # Pull-over-Push settlement credit
                self._credit_balance(task.sponsor, total_refund)
        else:
            task.status = "ESCALATED"

        self.tasks[task_id] = task

    @gl.public.write.payable
    def raise_dispute(self, task_id: str, reason: str = "") -> None:
        """Payable dispute: requires 10% appeal bond to lock and trigger arbitration."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status != "AWAITING_PAYOUT":
            raise UserError("Task is not in AWAITING_PAYOUT status")

        caller = str(gl.message.sender_address).lower()
        if caller != task.sponsor and caller != task.lab:
            raise UserError("Only sponsor or assigned replication lab can raise a dispute")

        now = self._get_current_timestamp()
        if now > task.payout_ready_at:
            raise UserError("24-hour dispute window has elapsed")

        min_bond = task.escrow_amount // bigint(10) # 10% Appeal Bond
        if gl.message.value < min_bond:
            raise UserError(f"Insufficient dispute appeal bond. Minimum 10% required ({min_bond})")

        task.appeal_bond = gl.message.value
        task.status = "DISPUTED"
        task.disputed_at = now
        if reason:
            task.reason = f"[DISPUTED by {caller[:8]}] {reason}"
        self.tasks[task_id] = task

    @gl.public.write
    def finalize_payout(self, task_id: str) -> None:
        """Finalizes payout into withdrawable escrow credit balances using safe Pull-over-Push pattern."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status != "AWAITING_PAYOUT":
            raise UserError("Task is not awaiting payout or is currently disputed")

        caller = str(gl.message.sender_address).lower()
        if caller != task.sponsor and caller != task.lab:
            raise UserError("Unauthorized caller")

        now = self._get_current_timestamp()
        if now < task.payout_ready_at:
            raise UserError("24-hour cooling-off period has not elapsed yet")

        escrow = task.escrow_amount
        stake = task.lab_stake
        task.status = "CLOSED"
        task.escrow_amount = bigint(0)
        task.lab_stake = bigint(0)

        # Pull-over-Push: credit into withdrawable balances
        if task.verdict == "APPROVED":
            self._credit_balance(task.lab, escrow + stake)
        elif task.verdict == "PARTIAL":
            half = escrow // bigint(2)
            rem = escrow - half
            self._credit_balance(task.lab, half + stake)
            self._credit_balance(task.sponsor, rem)

        self.tasks[task_id] = task

    @gl.public.write
    def resolve_dispute_via_referee(self, task_id: str) -> None:
        """AI Referee automatically resolves disputes on-chain and credits settlement balances."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status != "DISPUTED":
            raise UserError("Task is not in DISPUTED status")

        proto_str = task.protocol_url
        log_str = task.assay_log_url
        name_str = task.assay_name
        dispute_reason = task.reason
        prov_type = task.provenance_type
        inst_id = task.instrument_id
        lab_sig = task.lab_provenance_sig

        def leader_referee_fn() -> dict:
            try:
                p_res = gl.nondet.web.render(proto_str, mode="text")
                p_text = str(p_res)
            except Exception as e:
                p_text = f"Protocol fetch failed: {str(e)}"

            l_text = ""
            if not task.is_zk_mode:
                try:
                    l_res = gl.nondet.web.render(log_str, mode="text")
                    l_text = str(l_res)
                except Exception as e:
                    l_text = f"Telemetry log fetch failed: {str(e)}"
            else:
                l_text = f"ZK Shielded Compliance Mode. Hash: {task.zk_proof_hash}"

            prompt = f"""
You are an Independent AI Scientific Referee on GenLayer.
Evaluate the scientific dispute filed by the Sponsor against the Replication Lab.

ASSAY TITLE:
{name_str}

BASELINE SPECIFICATION:
{p_text}

TELEMETRY DATA / LOGS:
{l_text}

IMMUTABLE EVIDENCE COMMITMENTS:
- Protocol Spec Snapshot Hash: {task.protocol_spec_hash}
- Telemetry Data Snapshot Hash: {task.assay_log_hash if not task.is_zk_mode else task.zk_proof_hash}

LABORATORY PROVENANCE & INSTRUMENT ATTESTATION:
- Provenance Type: {prov_type}
- Instrument Model / ID: {inst_id}
- Lab Attestation Signature: {lab_sig if lab_sig else 'NONE'}

SPONSOR'S SCIENTIFIC DISPUTE REASON:
{dispute_reason}

DECISION FRAMEWORK:
- If the Sponsor's dispute is valid (e.g. baseline blanking uncalibrated, genuine cross-contamination, primer-dimers in NTC wells):
  Respond: {{"verdict": "REFUND", "reason": "Detailed scientific evaluation upholding the dispute."}}
- If the Sponsor's dispute is invalid (e.g. Lab performed the assay correctly, deviation is within tolerances, valid hardware attestation):
  Respond: {{"verdict": "RELEASE", "reason": "Detailed scientific evaluation rejecting the dispute."}}

Respond ONLY with valid JSON:
{{"verdict": "REFUND|RELEASE", "reason": "Clear scientific justification"}}
"""
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            return self._parse_llm_json(str(res))

        def validator_referee_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader_data = leader_res.calldata if hasattr(leader_res, "calldata") else leader_res
            if not isinstance(leader_data, dict):
                leader_data = self._parse_llm_json(str(leader_data))

            mine_data = leader_referee_fn()
            return str(leader_data.get("verdict")).upper() == str(mine_data.get("verdict")).upper()

        result = gl.vm.run_nondet(leader_referee_fn, validator_referee_fn)
        if not isinstance(result, dict):
            result = self._parse_llm_json(str(result))

        referee_verdict = str(result.get("verdict", "REFUND")).upper().strip()
        reason = "[AI Referee Decision] " + str(result.get("reason", "No reason provided"))

        escrow = task.escrow_amount
        stake = task.lab_stake
        bond = task.appeal_bond

        task.status = "CLOSED"
        task.escrow_amount = bigint(0)
        task.lab_stake = bigint(0)
        task.appeal_bond = bigint(0)
        task.reason = reason

        # Pull-over-Push safe settlement
        if referee_verdict == "RELEASE":
            # Lab wins: gets bounty + lab stake + slashed sponsor appeal bond
            self._credit_balance(task.lab, escrow + stake + bond)
        else:
            # Sponsor wins: gets refunded bounty + lab stake (slashed) + returned appeal bond
            self._credit_balance(task.sponsor, escrow + stake + bond)

        self.tasks[task_id] = task

    @gl.public.write
    def resolve_escalation(self, task_id: str, action: str) -> None:
        """Arbitration path for ESCALATED tasks (RELEASE, REFUND, or SPLIT) crediting safe withdrawable balances."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status not in ["ESCALATED", "DISPUTED"]:
            raise UserError("Task is not in ESCALATED or DISPUTED status")

        caller = str(gl.message.sender_address).lower()
        act = action.upper().strip()

        if caller == task.sponsor and caller != self.platform_admin:
            if act != "RELEASE":
                raise UserError("Sponsors can only voluntarily RELEASE funds. Only platform admin can enforce REFUND or SPLIT.")

        if caller != self.platform_admin and caller != task.sponsor:
            raise UserError("Unauthorized caller")

        escrow = task.escrow_amount
        stake = task.lab_stake
        bond = task.appeal_bond
        
        task.status = "CLOSED"
        task.escrow_amount = bigint(0)
        task.lab_stake = bigint(0)
        task.appeal_bond = bigint(0)

        # Pull-over-Push: credit into beneficiary balances
        if act == "RELEASE":
            self._credit_balance(task.lab, escrow + stake + bond)
        elif act == "REFUND":
            self._credit_balance(task.sponsor, escrow + stake + bond)
        elif act == "SPLIT":
            half = escrow // bigint(2)
            rem = escrow - half
            self._credit_balance(task.lab, half + stake)
            self._credit_balance(task.sponsor, rem + bond)
        else:
            raise UserError("Invalid action. Must be RELEASE, REFUND, or SPLIT")

        self.tasks[task_id] = task

    @gl.public.view
    def get_all_tasks(self) -> str:
        res = []
        for tid in self.task_ids:
            if tid in self.tasks:
                t = self.tasks[tid]
                res.append({
                    "id": tid,
                    "sponsor": t.sponsor,
                    "lab": t.lab,
                    "escrow_amount": str(t.escrow_amount),
                    "lab_stake": str(t.lab_stake),
                    "appeal_bond": str(t.appeal_bond),
                    "status": t.status,
                    "protocol_url": t.protocol_url,
                    "protocol_spec_hash": t.protocol_spec_hash,
                    "assay_log_url": t.assay_log_url,
                    "assay_log_hash": t.assay_log_hash,
                    "assay_name": t.assay_name,
                    "tolerance_criteria": t.tolerance_criteria,
                    "blacklist_anomalies": t.blacklist_anomalies,
                    "verdict": t.verdict,
                    "reason": t.reason,
                    "confidence": str(t.confidence),
                    "attempts": str(t.attempts),
                    "payout_ready_at": str(t.payout_ready_at),
                    "disputed_at": str(t.disputed_at),
                    "is_zk_mode": t.is_zk_mode,
                    "zk_proof_hash": t.zk_proof_hash,
                    "lab_provenance_sig": t.lab_provenance_sig,
                    "provenance_type": t.provenance_type,
                    "instrument_id": t.instrument_id
                })
        return json.dumps(res)
