# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json

@allow_storage
@dataclass
class AssayTask:
    sponsor: str
    lab: str
    escrow_amount: bigint
    lab_stake: bigint
    status: str            # OPEN, IN_PROGRESS, AWAITING_PAYOUT, NEEDS_REVISION, DISPUTED, ESCALATED, CLOSED
    protocol_url: str      # URL to baseline experimental protocol & statistical benchmarks
    assay_log_url: str     # URL to raw replication logs / CSV / spectrophotometry telemetry
    assay_name: str        # e.g., "Cas12a Cleavage Kinetic Replication Assay"
    tolerance_criteria: str# Statistical tolerances: p-value < 0.01, R^2 > 0.98, CV < 5%
    blacklist_anomalies: str# Negative controls failed, batch contamination, saturated peaks
    verdict: str           # APPROVED, PARTIAL, REFUND, ESCALATE
    reason: str
    confidence: bigint
    attempts: bigint
    payout_ready_at: bigint
    disputed_at: bigint

class Contract(gl.Contract):
    platform_admin: str
    tasks: TreeMap[str, AssayTask]
    task_ids: DynArray[str]

    def __init__(self):
        self.platform_admin = str(gl.message.sender_address).lower()

    def _get_current_timestamp(self) -> bigint:
        """Derive trusted execution timestamp strictly from transaction context."""
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
        """Robust parser handling raw JSON or markdown code fences."""
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
            return {"verdict": "ESCALATE", "confidence": 0, "reason": f"JSON parse failure: {str(e)}"}

    def _effective_verdict(self, data: dict) -> str:
        """Enforces deterministic settlement verdict by applying confidence threshold."""
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

    @gl.public.write.payable
    def create_assay_task(
        self,
        task_id: str,
        protocol_url: str,
        assay_name: str,
        tolerance_criteria: str,
        blacklist_anomalies: str
    ) -> None:
        if task_id in self.tasks:
            raise UserError(f"Assay task ID {task_id} already exists")
        
        escrow_amt = gl.message.value
        if escrow_amt <= bigint(0):
            raise UserError("Escrow bounty must be strictly positive")
        if not protocol_url.startswith("http"):
            raise UserError("Valid protocol specification HTTP/HTTPS URL required")

        caller = str(gl.message.sender_address).lower()
        
        self.tasks[task_id] = AssayTask(
            sponsor=caller,
            lab="0x0000000000000000000000000000000000000000",
            escrow_amount=escrow_amt,
            lab_stake=bigint(0),
            status="OPEN",
            protocol_url=protocol_url.strip(),
            assay_log_url="",
            assay_name=assay_name.strip(),
            tolerance_criteria=tolerance_criteria.strip(),
            blacklist_anomalies=blacklist_anomalies.strip(),
            verdict="NONE",
            reason="Awaiting replication lab acceptance",
            confidence=bigint(0),
            attempts=bigint(0),
            payout_ready_at=bigint(0),
            disputed_at=bigint(0)
        )
        self.task_ids.append(task_id)

    @gl.public.write.payable
    def accept_assay_task(self, task_id: str) -> None:
        """Replication Lab deposits mandatory 20% stake to lock experiment."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status != "OPEN":
            raise UserError("Task is not in OPEN status")

        caller = str(gl.message.sender_address).lower()
        if caller == task.sponsor:
            raise UserError("Sponsor cannot replicate their own assay")

        min_stake = task.escrow_amount // bigint(5)  # 20% stake
        if gl.message.value < min_stake or gl.message.value <= bigint(0):
            raise UserError(f"Insufficient lab stake. Minimum 20% required ({min_stake})")

        task.lab = caller
        task.lab_stake = gl.message.value
        task.status = "IN_PROGRESS"
        self.tasks[task_id] = task

    @gl.public.write
    def submit_assay_telemetry(self, task_id: str, assay_log_url: str) -> None:
        """Replication lab submits raw assay telemetry URL for multi-agent GenVM validation."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        caller = str(gl.message.sender_address).lower()
        
        if caller != task.lab:
            raise UserError("Only the designated replication lab can submit telemetry")
        if task.status not in ["IN_PROGRESS", "NEEDS_REVISION"]:
            raise UserError("Task is not ready for telemetry submission")
        if not assay_log_url.startswith("http"):
            raise UserError("Valid telemetry log HTTP/HTTPS URL required")

        task.assay_log_url = assay_log_url.strip()
        task.attempts += bigint(1)
        
        proto_str = task.protocol_url
        log_str = task.assay_log_url
        name_str = task.assay_name
        tol_str = task.tolerance_criteria
        ano_str = task.blacklist_anomalies

        def leader_fn() -> dict:
            # 1. Anti-Rugpull Guard: Check sponsor baseline protocol endpoint
            try:
                p_res = gl.nondet.web.render(proto_str, mode="text")
                p_text = str(p_res)
                if any(err in p_text[:400].lower() for err in ["404 not found", "error 404", "not found"]):
                    return {"verdict": "ESCALATE", "confidence": 100, "reason": "Baseline protocol URL is 404; escrow held to protect replication lab."}
            except Exception as e:
                return {"verdict": "ESCALATE", "confidence": 100, "reason": f"Protocol fetch failed: {str(e)}"}

            # 2. Anti-Spam Guard: Check lab telemetry endpoint
            try:
                l_res = gl.nondet.web.render(log_str, mode="text")
                l_text = str(l_res)
                if any(err in l_text[:400].lower() for err in ["404 not found", "error 404", "not found"]):
                    return {"verdict": "REFUND", "confidence": 100, "reason": "Assay log URL is 404 or empty."}
            except Exception as e:
                return {"verdict": "REFUND", "confidence": 100, "reason": f"Telemetry log fetch failed: {str(e)}"}

            prompt = f"""
You are a Principal Bioinformatician & DeSci Replication Judge on GenLayer.
Evaluate the replication assay telemetry against the baseline scientific protocol.

ASSAY TITLE:
{name_str}

BASELINE PROTOCOL SPECIFICATION & REAGENTS:
{p_text[:2500]}

STATISTICAL TOLERANCE & ACCEPTANCE CRITERIA:
{tol_str}

FORBIDDEN EXPERIMENTAL ANOMALIES & FAILURE MODES:
{ano_str}

SUBMITTED ASSAY TELEMETRY / LAB LOGS:
{l_text[:2500]}

DECISION FRAMEWORK:
- APPROVED: Kinetic curves/spectrometry replicate baseline within statistical tolerances, negative controls intact, zero forbidden anomalies.
- PARTIAL: Slight yield/kinetic offset but replication methodology and controls are statistically sound and valuable.
- REFUND: Negative control failure, fabricated/flatline curves, statistical divergence beyond limits, or critical contamination.
- ESCALATE: Data corrupted, noisy uncalibrated sensors, or requires human scientific peer-review.

Respond ONLY with valid JSON:
{{"verdict": "APPROVED|PARTIAL|REFUND|ESCALATE", "confidence": 0-100, "reason": "Rigorous quantitative justification"}}
"""
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            return self._parse_llm_json(str(res))

        def validator_fn(leader_res) -> bool:
            """Consensus verification comparing deterministic effective verdicts."""
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
        reason = str(result.get("reason", "No reason provided"))

        if conf < 65:
            reason = f"[Confidence {conf}% < 65%] " + reason

        task.verdict = final_verdict
        task.reason = reason
        task.confidence = bigint(conf)

        if final_verdict in ["APPROVED", "PARTIAL"]:
            task.status = "AWAITING_PAYOUT"
            task.payout_ready_at = self._get_current_timestamp() + bigint(86400) # 24h dispute window
        elif final_verdict == "REFUND":
            if task.attempts < bigint(2):
                task.status = "NEEDS_REVISION"
            else:
                # Slashing: 2 consecutive failures -> full escrow + slashed stake returned to sponsor
                task.status = "CLOSED"
                total_refund = task.escrow_amount + task.lab_stake
                task.escrow_amount = bigint(0)
                task.lab_stake = bigint(0)
                gl.get_contract_at(Address(task.sponsor)).emit_transfer(value=u256(total_refund))
        else:
            task.status = "ESCALATED"

        self.tasks[task_id] = task

    @gl.public.write
    def raise_dispute(self, task_id: str, reason: str = "") -> None:
        """Transitions task from AWAITING_PAYOUT to DISPUTED within 24h, locking finalization."""
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

        task.status = "DISPUTED"
        task.disputed_at = now
        if reason:
            task.reason = f"[DISPUTED by {caller[:8]}] {reason}"
        self.tasks[task_id] = task

    @gl.public.write
    def finalize_payout(self, task_id: str) -> None:
        """Disburses escrow funds strictly after 24h cooling-off when no active dispute exists."""
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

        if task.verdict == "APPROVED":
            gl.get_contract_at(Address(task.lab)).emit_transfer(value=u256(escrow + stake))
        elif task.verdict == "PARTIAL":
            half = escrow // bigint(2)
            rem = escrow - half
            gl.get_contract_at(Address(task.lab)).emit_transfer(value=u256(half + stake))
            gl.get_contract_at(Address(task.sponsor)).emit_transfer(value=u256(rem))

        self.tasks[task_id] = task

    @gl.public.write
    def resolve_escalation(self, task_id: str, action: str) -> None:
        """Arbitration path for ESCALATED or DISPUTED tasks."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status not in ["ESCALATED", "DISPUTED"]:
            raise UserError("Task is not in ESCALATED or DISPUTED status")

        caller = str(gl.message.sender_address).lower()
        act = action.upper().strip()

        # Anti-exploit: Sponsor can only voluntarily concede (RELEASE)
        if caller == task.sponsor and caller != self.platform_admin:
            if act != "RELEASE":
                raise UserError("Sponsors can only voluntarily RELEASE funds. Only platform admin can enforce REFUND or SPLIT.")

        if caller != self.platform_admin and caller != task.sponsor:
            raise UserError("Unauthorized caller")

        escrow = task.escrow_amount
        stake = task.lab_stake
        task.status = "CLOSED"
        task.escrow_amount = bigint(0)
        task.lab_stake = bigint(0)

        if act == "RELEASE":
            gl.get_contract_at(Address(task.lab)).emit_transfer(value=u256(escrow + stake))
        elif act == "REFUND":
            gl.get_contract_at(Address(task.sponsor)).emit_transfer(value=u256(escrow + stake))
        elif act == "SPLIT":
            half = escrow // bigint(2)
            rem = escrow - half
            gl.get_contract_at(Address(task.lab)).emit_transfer(value=u256(half + stake))
            gl.get_contract_at(Address(task.sponsor)).emit_transfer(value=u256(rem))
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
                    "status": t.status,
                    "protocol_url": t.protocol_url,
                    "assay_log_url": t.assay_log_url,
                    "assay_name": t.assay_name,
                    "tolerance_criteria": t.tolerance_criteria,
                    "blacklist_anomalies": t.blacklist_anomalies,
                    "verdict": t.verdict,
                    "reason": t.reason,
                    "confidence": str(t.confidence),
                    "attempts": str(t.attempts),
                    "payout_ready_at": str(t.payout_ready_at),
                    "disputed_at": str(t.disputed_at)
                })
        return json.dumps(res)
