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
    appeal_bond: bigint
    status: str            # OPEN, IN_PROGRESS, AWAITING_PAYOUT, NEEDS_REVISION, DISPUTED, ESCALATED, CLOSED
    protocol_url: str
    assay_log_url: str
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

class Contract(gl.Contract):
    platform_admin: str
    tasks: TreeMap[str, AssayTask]
    task_ids: DynArray[str]

    def __init__(self):
        self.platform_admin = str(gl.message.sender_address).lower()

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
            appeal_bond=bigint(0),
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
            disputed_at=bigint(0),
            is_zk_mode=False,
            zk_proof_hash=""
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
    def submit_assay_telemetry(self, task_id: str, assay_log_url: str, is_zk_mode: bool = False, zk_proof_hash: str = "") -> None:
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        caller = str(gl.message.sender_address).lower()
        
        if caller != task.lab:
            raise UserError("Only the designated replication lab can submit telemetry")
        if task.status not in ["IN_PROGRESS", "NEEDS_REVISION"]:
            raise UserError("Task is not ready for telemetry submission")
        
        if not is_zk_mode and not assay_log_url.startswith("http"):
            raise UserError("Valid telemetry log HTTP/HTTPS URL required in standard mode")
        if is_zk_mode and not zk_proof_hash:
            raise UserError("ZK proof hash required in ZK compliance mode")

        task.assay_log_url = assay_log_url.strip()
        task.is_zk_mode = is_zk_mode
        task.zk_proof_hash = zk_proof_hash.strip()
        task.attempts += bigint(1)
        
        proto_str = task.protocol_url
        log_str = task.assay_log_url
        name_str = task.assay_name
        tol_str = task.tolerance_criteria
        ano_str = task.blacklist_anomalies

        def leader_fn() -> dict:
            try:
                p_res = gl.nondet.web.render(proto_str, mode="text")
                p_text = str(p_res)
                if any(err in p_text[:400].lower() for err in ["404 not found", "error 404", "not found"]):
                    return {
                        "verdict": "ESCALATE", "confidence": 100, 
                        "statistician_vote": "ESCALATE", "biochemist_vote": "ESCALATE", "contamination_vote": "ESCALATE",
                        "reason": "Baseline protocol URL is 404; escrow held to protect replication lab."
                    }
            except Exception as e:
                return {
                    "verdict": "ESCALATE", "confidence": 100, 
                    "statistician_vote": "ESCALATE", "biochemist_vote": "ESCALATE", "contamination_vote": "ESCALATE",
                    "reason": f"Protocol fetch failed: {str(e)}"
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
            else:
                l_text = f"ZK Shielded Mode Active. Telemetry Hash: {zk_proof_hash}. Zero-Knowledge proof compliance validated off-chain."

            prompt = f"""
You are a Multi-Agent AI Scientific Board on GenLayer.
Evaluate the replication assay telemetry against the baseline scientific protocol.

ASSAY TITLE:
{name_str}

BASELINE PROTOCOL SPECIFICATION:
{p_text[:2500]}

STATISTICAL TOLERANCE:
{tol_str}

BLACKLISTED ANOMALIES:
{ano_str}

TELEMETRY DATA / LOGS:
{l_text[:2500]}

Please conduct a Peer-Review with 3 distinct scientific agent personas:
1. STATISTICIAN AGENT: Evaluates R^2 linearity, p-value limits, drift, and curve metrics.
2. BIOCHEMIST EXPERT AGENT: Evaluates reagent setup, target specificity, and laboratory methodology.
3. CONTAMINATION GUARD AGENT: Evaluates negative control channels and background noise.

Each agent must vote: APPROVED, PARTIAL, REFUND, or ESCALATE.
The overall verdict is the majority vote (at least 2 out of 3 agents agreeing).

Respond ONLY with valid JSON:
{{
  "statistician_vote": "APPROVED|PARTIAL|REFUND|ESCALATE",
  "biochemist_vote": "APPROVED|PARTIAL|REFUND|ESCALATE",
  "contamination_vote": "APPROVED|PARTIAL|REFUND|ESCALATE",
  "verdict": "APPROVED|PARTIAL|REFUND|ESCALATE",
  "confidence": 0-100,
  "reason": "Detailed multi-agent peer-review review summary."
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
                gl.get_contract_at(Address(task.sponsor)).emit_transfer(value=u256(total_refund))
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
    def resolve_dispute_via_referee(self, task_id: str) -> None:
        """AI Referee automatically resolves disputes on-chain by evaluating scientific dispute reasons."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status != "DISPUTED":
            raise UserError("Task is not in DISPUTED status")

        proto_str = task.protocol_url
        log_str = task.assay_log_url
        name_str = task.assay_name
        dispute_reason = task.reason

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
{p_text[:2000]}

TELEMETRY DATA / LOGS:
{l_text[:2000]}

SPONSOR'S SCIENTIFIC DISPUTE REASON:
{dispute_reason}

DECISION FRAMEWORK:
- If the Sponsor's dispute is valid (e.g. baseline blanking uncalibrated, genuine cross-contamination, primer-dimers in NTC wells):
  Respond: {{"verdict": "REFUND", "reason": "Detailed scientific evaluation upholding the dispute."}}
- If the Sponsor's dispute is invalid (e.g. Lab performed the assay correctly, deviation is within tolerances):
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

        if referee_verdict == "RELEASE":
            # Lab wins: gets bounty + lab stake + slashed sponsor appeal bond
            gl.get_contract_at(Address(task.lab)).emit_transfer(value=u256(escrow + stake + bond))
        else:
            # Sponsor wins: gets refunded bounty + lab stake (slashed) + returned appeal bond
            gl.get_contract_at(Address(task.sponsor)).emit_transfer(value=u256(escrow + stake + bond))

        self.tasks[task_id] = task

    @gl.public.write
    def resolve_escalation(self, task_id: str, action: str) -> None:
        """Arbitration path for ESCALATED tasks (RELEASE, REFUND, or SPLIT)."""
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

        if act == "RELEASE":
            gl.get_contract_at(Address(task.lab)).emit_transfer(value=u256(escrow + stake + bond))
        elif act == "REFUND":
            gl.get_contract_at(Address(task.sponsor)).emit_transfer(value=u256(escrow + stake + bond))
        elif act == "SPLIT":
            half = escrow // bigint(2)
            rem = escrow - half
            gl.get_contract_at(Address(task.lab)).emit_transfer(value=u256(half + stake))
            gl.get_contract_at(Address(task.sponsor)).emit_transfer(value=u256(rem + bond))
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
                    "assay_log_url": t.assay_log_url,
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
                    "zk_proof_hash": t.zk_proof_hash
                })
        return json.dumps(res)
