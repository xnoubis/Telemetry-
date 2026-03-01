"""Morphic Tutor API Server

FastAPI backend orchestrating:
- Vibe-to-Critical Handoff Protocol (VCHP)
- LAPSE Single-Frame Evaluation
- Musical Rosetta Stone
- Puff Place Matchmaking
- Houdini Ticket / Excaliburcon minting

This module is intentionally "polyarchitectural": it hosts schemas + minimal
orchestration so frontends can iterate quickly without dragging a full platform
behind them.

Common FastAPI "errors" (read: predictable human API-shape mismatches):
- 422 Unprocessable Entity because you sent JSON but your endpoint parameter was
  treated as a *query param* (e.g., `prompt: str` without a Body model).
- 422 because you defined *multiple body params* (two Pydantic models) and then
  posted a single flat object, but FastAPI expects a wrapper object.

This file uses wrapper request models to avoid those footguns.
"""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Literal, Tuple

from pydantic import BaseModel, Field


try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware

    FASTAPI_AVAILABLE = True
except Exception:
    FastAPI = None

    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    CORSMiddleware = None
    FASTAPI_AVAILABLE = False


class AnchorTrace(BaseModel):
    mode: Literal["dragonfly", "starfish"] = Field(
        ..., description="'dragonfly' (fast/sharp) or 'starfish' (slow/smeared)"
    )
    visible_trail: List[Dict[str, float]] = Field(
        default_factory=list, description="Recent anchor coordinates"
    )
    ghost_prediction: Optional[Dict[str, float]] = Field(
        None, description="Where the model expected the anchor to be"
    )
    salience_budget: float = Field(
        1.0, ge=0.0, le=1.0, description="User-controlled visibility of the anchor"
    )


class SnapEvent(BaseModel):
    delta_entropy: float = 0.0
    anchor_trace: Optional[AnchorTrace] = None


class StereogramToken(BaseModel):
    operator_hash: str
    snap_event: Optional[SnapEvent] = None


class HarmonicSemanticRecipe(BaseModel):
    affect: str = Field(..., description="Valence/arousal (e.g., calm <-> panic)")
    motion: str = Field(..., description="Acceleration profile (e.g., swirl, jerky)")
    density: str = Field(..., description="Sparse <-> Swarm")
    timbre_palette: str = Field(..., description="Airy <-> Gritty")
    gesture_vocabulary: str = Field(..., description="Waves, gusts, grasping hits")
    harmony: str = Field(..., description="Stable center <-> drifting")
    form: str = Field(..., description="Narrative arc (e.g., build -> break -> shelter)")
    agency_signal: str = Field(..., description="Helping hands, call/response")


class ProvenanceLog(BaseModel):
    author_intent: str
    hsr_snapshot: HarmonicSemanticRecipe
    licensed_corpora_refs: List[str]


class SemanticPrompt(BaseModel):
    prompt: str = Field(..., min_length=1)


class RecipeDefinition(BaseModel):
    name: str
    origin_signals: List[str]
    constraints: List[str]
    success_metrics: List[str]
    puff_places: List[str]
    failure_envelope: List[str]


class MatchmakingScore(BaseModel):
    mission_alignment: float = Field(..., ge=0.0, le=1.0)
    risk_profile_fit: float = Field(..., ge=0.0, le=1.0)
    data_governance_readiness: float = Field(..., ge=0.0, le=1.0)
    decision_maker_clarity: float = Field(..., ge=0.0, le=1.0)
    time_window_availability: float = Field(..., ge=0.0, le=1.0)


class ResourcePullTrigger(BaseModel):
    approved: bool
    confidence_score: float
    assigned_puff_place: Optional[str]
    reversibility_guaranteed: bool


class PilotMatchmakeRequest(BaseModel):
    recipe: RecipeDefinition
    scores: MatchmakingScore


class CognitiveStrata(BaseModel):
    observations: List[str] = Field(default_factory=list)
    interpretations: List[str] = Field(default_factory=list)
    projections: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)


class MorphicState(BaseModel):
    declared_invariants: List[str] = Field(default_factory=list)
    implied_invariants: List[str] = Field(default_factory=list)
    open_questions: List[str] = Field(default_factory=list)
    risk_flags: List[str] = Field(default_factory=list)
    strata: CognitiveStrata
    drift_score: float = Field(0.0, ge=0.0, le=1.0)
    branch_parent: Optional[str] = None


class Terrain(BaseModel):
    page_url: str
    focus_anchors: List[Dict[str, Any]] = Field(default_factory=list)
    semantic_queries: List[str] = Field(default_factory=list)
    dom_context: Optional[str] = None


class MintRequest(BaseModel):
    state: MorphicState
    terrain: Terrain
    token: StereogramToken


class ProofReceipt(BaseModel):
    morphic_state: dict
    stereogram_operator_hash: str
    snap_delta_entropy: float
    timestamp: str
    content_hash: str


def _dump_model(obj: Any) -> Any:
    if hasattr(obj, "model_dump"):
        try:
            return obj.model_dump(mode="json")
        except TypeError:
            return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    return obj


def _to_jsonable(obj: Any) -> Any:
    if isinstance(obj, BaseModel):
        return _to_jsonable(_dump_model(obj))
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {str(k): _to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_jsonable(v) for v in obj]
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    return str(obj)


def _canonical_json(obj: Any) -> str:
    safe = _to_jsonable(obj)
    return json.dumps(safe, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _euclid(a: Dict[str, float], b: Dict[str, float]) -> float:
    ax, ay = float(a.get("x", 0.0)), float(a.get("y", 0.0))
    bx, by = float(b.get("x", 0.0)), float(b.get("y", 0.0))
    dx, dy = ax - bx, ay - by
    return (dx * dx + dy * dy) ** 0.5


class PilotMatchmaker:
    def evaluate(self, recipe: RecipeDefinition, scores: MatchmakingScore) -> ResourcePullTrigger:
        is_safe = any("reversible" in f.lower() for f in recipe.failure_envelope)
        composite_score = (
            scores.mission_alignment * 0.3
            + scores.risk_profile_fit * 0.3
            + scores.data_governance_readiness * 0.2
            + scores.decision_maker_clarity * 0.1
            + scores.time_window_availability * 0.1
        )
        approved = composite_score >= 0.8 and is_safe
        assigned_place = recipe.puff_places[0] if approved and recipe.puff_places else None
        return ResourcePullTrigger(
            approved=approved,
            confidence_score=composite_score,
            assigned_puff_place=assigned_place,
            reversibility_guaranteed=is_safe,
        )


class MorphicTutorMinter:
    def _content_hash(self, state: MorphicState, terrain: Terrain, token: StereogramToken) -> str:
        material = {
            "morphic_state": _dump_model(state),
            "terrain": _dump_model(terrain),
            "token_operator": token.operator_hash,
            "snap_event": _dump_model(token.snap_event) if token.snap_event else None,
        }
        return "content_" + sha256_hex(_canonical_json(material))[:32]

    def synthesize_sigil(self, content_hash: str) -> str:
        salt = secrets.token_hex(8)
        return "sigil_" + sha256_hex(content_hash + ":" + salt)[:24]

    def _check_cognitive_hygiene(self, state: MorphicState, token: StereogramToken) -> None:
        if state.drift_score > 0.8:
            state.risk_flags.append("CRITICAL_DRIFT: Improvisation outpacing resolution.")
        if token.snap_event and token.snap_event.delta_entropy > 5.0:
            state.risk_flags.append("EDSD_LATENCY_SPIKE: Anchor phase-shift exceeds coherence bounds.")
        if not state.declared_invariants and not state.implied_invariants:
            state.risk_flags.append("COLLAPSE_RISK: No structural invariants anchored.")

    def export(self, req: MintRequest) -> dict:
        self._check_cognitive_hygiene(req.state, req.token)
        content_hash = self._content_hash(req.state, req.terrain, req.token)
        handle = self.synthesize_sigil(content_hash)
        world_hash = "world_" + sha256_hex(_canonical_json(_dump_model(req.terrain)))[:16]
        snap_delta = req.token.snap_event.delta_entropy if req.token.snap_event else 0.0
        receipt = ProofReceipt(
            morphic_state=_dump_model(req.state),
            stereogram_operator_hash=req.token.operator_hash,
            snap_delta_entropy=snap_delta,
            timestamp=datetime.now(timezone.utc).isoformat(),
            content_hash=content_hash,
        )
        return {
            "_type": "Across_Domain_Credential",
            "_modality": "Houdini_Ticket",
            "handle": handle,
            "world_hash": world_hash,
            "proof_receipt": _dump_model(receipt),
        }


minter = MorphicTutorMinter()
matchmaker = PilotMatchmaker()


def health_check_logic() -> dict:
    return {"status": "ok", "system": "LAPSE_EDSD_HSR_ACTIVE"}


def evaluate_single_frame_logic(trace: AnchorTrace) -> dict:
    if not trace.visible_trail and not trace.ghost_prediction:
        return {"error": "Baseline failed: No external persistence found. Temporal inference impossible."}

    base_ms_per_tick = 16.66 if trace.mode == "dragonfly" else 50.0
    inferred_delta_t = len(trace.visible_trail) * base_ms_per_tick

    if trace.ghost_prediction and trace.visible_trail:
        current = trace.visible_trail[-1]
        ghost_err = _euclid(current, trace.ghost_prediction)
        inferred_delta_t = inferred_delta_t * (1.0 + min(ghost_err / 1000.0, 1.0))

    return {
        "status": "success",
        "inferred_latency_ms": inferred_delta_t,
        "scaffold_mode": trace.mode,
        "conclusion": "C12b Validated: Persistence successfully externalized to frame trace.",
    }


def translate_semantic_to_hsr_logic(req: SemanticPrompt) -> HarmonicSemanticRecipe:
    _ = req.prompt
    return HarmonicSemanticRecipe(
        affect="Calm intersecting with high-arousal panic",
        motion="Rotating turbulence, sudden pressure drops",
        density="Swarm / Stacked layers",
        timbre_palette="Airy flutes vs. Gritty low brass",
        gesture_vocabulary="Gusts, grasping hits",
        harmony="Dissonant cluster swells resolving to warm triads",
        form="Long calm bed -> Turbulence -> Shelter chords",
        agency_signal="Supportive counter-melodies / Clenched rhythm lock",
    )


def evaluate_pilot_recipe_logic(req: PilotMatchmakeRequest) -> ResourcePullTrigger:
    return matchmaker.evaluate(req.recipe, req.scores)


def mint_houdini_ticket_logic(req: MintRequest) -> dict:
    return minter.export(req)


app = None


def _build_fastapi_app() -> Any:
    app_local = FastAPI(title="Morphic Polyarchitectural Server", version="1.0.0")

    app_local.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app_local.get("/health")
    def _health_check():
        return health_check_logic()

    @app_local.post("/evaluate/lapse-single-frame")
    def _evaluate_single_frame(trace: AnchorTrace):
        return evaluate_single_frame_logic(trace)

    @app_local.post("/translate/music", response_model=HarmonicSemanticRecipe)
    def _translate_semantic_to_hsr(req: SemanticPrompt):
        return translate_semantic_to_hsr_logic(req)

    @app_local.post("/matchmake/pilot", response_model=ResourcePullTrigger)
    def _evaluate_pilot_recipe(req: PilotMatchmakeRequest):
        return evaluate_pilot_recipe_logic(req)

    @app_local.post("/mint")
    def _mint_houdini_ticket(req: MintRequest):
        try:
            return mint_houdini_ticket_logic(req)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return app_local


if FASTAPI_AVAILABLE:
    app = _build_fastapi_app()


def _read_json_body(raw: bytes) -> Tuple[Optional[Any], Optional[str]]:
    try:
        if not raw:
            return None, "Empty body"
        return json.loads(raw.decode("utf-8")), None
    except Exception as e:
        return None, str(e)


def _network_bind_supported(host: str, port: int) -> bool:
    if os.environ.get("MORPHIC_TUTOR_NO_NETWORK") == "1":
        return False
    try:
        import socket

        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind((host, port))
            return True
        finally:
            try:
                s.close()
            except Exception:
                pass
    except OSError as e:
        if getattr(e, "errno", None) == 138:
            return False
        return False
    except Exception:
        return False


def _serve_http_fallback(host: str, port: int) -> None:
    from http.server import BaseHTTPRequestHandler, HTTPServer

    class Handler(BaseHTTPRequestHandler):
        def _send(self, status: int, body: Any):
            payload = _canonical_json(body).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def do_GET(self):
            if self.path == "/health":
                return self._send(200, health_check_logic())
            return self._send(404, {"error": "Not found"})

        def do_POST(self):
            length = int(self.headers.get("Content-Length", "0") or "0")
            raw = self.rfile.read(length)
            data, err = _read_json_body(raw)
            if err:
                return self._send(400, {"error": "Invalid JSON", "detail": err})

            try:
                if self.path == "/evaluate/lapse-single-frame":
                    trace = (
                        AnchorTrace.model_validate(data)
                        if hasattr(AnchorTrace, "model_validate")
                        else AnchorTrace.parse_obj(data)
                    )
                    return self._send(200, evaluate_single_frame_logic(trace))

                if self.path == "/translate/music":
                    req = (
                        SemanticPrompt.model_validate(data)
                        if hasattr(SemanticPrompt, "model_validate")
                        else SemanticPrompt.parse_obj(data)
                    )
                    out = translate_semantic_to_hsr_logic(req)
                    return self._send(200, _dump_model(out))

                if self.path == "/matchmake/pilot":
                    req = (
                        PilotMatchmakeRequest.model_validate(data)
                        if hasattr(PilotMatchmakeRequest, "model_validate")
                        else PilotMatchmakeRequest.parse_obj(data)
                    )
                    out = evaluate_pilot_recipe_logic(req)
                    return self._send(200, _dump_model(out))

                if self.path == "/mint":
                    req = (
                        MintRequest.model_validate(data)
                        if hasattr(MintRequest, "model_validate")
                        else MintRequest.parse_obj(data)
                    )
                    out = mint_houdini_ticket_logic(req)
                    return self._send(200, out)

                return self._send(404, {"error": "Not found"})
            except Exception as e:
                return self._send(400, {"error": "Request validation failed", "detail": str(e)})

        def log_message(self, format: str, *args: Any) -> None:
            return

    server = HTTPServer((host, port), Handler)
    try:
        server.serve_forever()
    finally:
        server.server_close()


def _no_network_exit_payload(host: str, port: int) -> dict:
    return {
        "status": "no_network",
        "detail": "Network bindings are not supported in this environment.",
        "host": host,
        "port": port,
        "hint": "Run with --test to execute unit tests, or set MORPHIC_TUTOR_NO_NETWORK=1 to force non-network mode.",
    }


def run_dev_server(host: str = "0.0.0.0", port: int = 8787, reload: bool = True) -> str:
    if not _network_bind_supported(host, port):
        print(_canonical_json(_no_network_exit_payload(host, port)))
        return "no_network"

    if FASTAPI_AVAILABLE:
        try:
            import uvicorn

            module = __name__ if __name__ != "__main__" else "server"
            uvicorn.run(f"{module}:app", host=host, port=port, reload=reload)
            return "served"
        except Exception:
            pass

    try:
        _serve_http_fallback(host, port)
        return "served"
    except OSError as e:
        if getattr(e, "errno", None) == 138:
            print(_canonical_json(_no_network_exit_payload(host, port)))
            return "no_network"
        raise


import unittest


class TestLapseSingleFrame(unittest.TestCase):
    def test_baseline_requires_persistence(self):
        trace = AnchorTrace(mode="dragonfly", visible_trail=[], ghost_prediction=None, salience_budget=1.0)
        out = evaluate_single_frame_logic(trace)
        self.assertIn("error", out)

    def test_dragonfly_latency_scales_with_trail(self):
        trace = AnchorTrace(
            mode="dragonfly",
            visible_trail=[{"x": 0.0, "y": 0.0}, {"x": 1.0, "y": 1.0}, {"x": 2.0, "y": 2.0}],
            ghost_prediction=None,
            salience_budget=1.0,
        )
        out = evaluate_single_frame_logic(trace)
        self.assertEqual(out["status"], "success")
        self.assertAlmostEqual(out["inferred_latency_ms"], 3 * 16.66, places=2)

    def test_ghost_increases_latency(self):
        trace = AnchorTrace(
            mode="dragonfly",
            visible_trail=[{"x": 0.0, "y": 0.0}],
            ghost_prediction={"x": 1000.0, "y": 0.0},
            salience_budget=1.0,
        )
        out = evaluate_single_frame_logic(trace)
        self.assertGreater(out["inferred_latency_ms"], 16.66)


class TestMatchmaker(unittest.TestCase):
    def test_matchmaker_rejects_without_reversibility(self):
        recipe = RecipeDefinition(
            name="r",
            origin_signals=["o"],
            constraints=["c"],
            success_metrics=["s"],
            puff_places=["p1"],
            failure_envelope=["nonreversible"],
        )
        scores = MatchmakingScore(
            mission_alignment=1.0,
            risk_profile_fit=1.0,
            data_governance_readiness=1.0,
            decision_maker_clarity=1.0,
            time_window_availability=1.0,
        )
        out = matchmaker.evaluate(recipe, scores)
        self.assertFalse(out.approved)

    def test_matchmaker_approves_with_reversibility_and_score(self):
        recipe = RecipeDefinition(
            name="r",
            origin_signals=["o"],
            constraints=["c"],
            success_metrics=["s"],
            puff_places=["p1"],
            failure_envelope=["reversible rollout"],
        )
        scores = MatchmakingScore(
            mission_alignment=1.0,
            risk_profile_fit=1.0,
            data_governance_readiness=1.0,
            decision_maker_clarity=1.0,
            time_window_availability=1.0,
        )
        out = matchmaker.evaluate(recipe, scores)
        self.assertTrue(out.approved)
        self.assertEqual(out.assigned_puff_place, "p1")


class TestMinting(unittest.TestCase):
    def test_content_hash_stable_handle_varies(self):
        req = MintRequest(
            state=MorphicState(
                declared_invariants=["x"],
                implied_invariants=[],
                open_questions=[],
                risk_flags=[],
                strata=CognitiveStrata(observations=["o"], interpretations=[], projections=[], actions=[]),
                drift_score=0.0,
                branch_parent=None,
            ),
            terrain=Terrain(
                page_url="https://example.com",
                focus_anchors=[{"k": "v"}],
                semantic_queries=["q"],
                dom_context=None,
            ),
            token=StereogramToken(operator_hash="op", snap_event=SnapEvent(delta_entropy=0.0, anchor_trace=None)),
        )
        a = minter.export(req)
        b = minter.export(req)
        self.assertEqual(a["proof_receipt"]["content_hash"], b["proof_receipt"]["content_hash"])
        self.assertNotEqual(a["handle"], b["handle"])


class TestNoNetworkHandling(unittest.TestCase):
    def test_run_dev_server_returns_no_network_when_forced(self):
        old = os.environ.get("MORPHIC_TUTOR_NO_NETWORK")
        os.environ["MORPHIC_TUTOR_NO_NETWORK"] = "1"
        try:
            status = run_dev_server(host="0.0.0.0", port=8787, reload=False)
            self.assertEqual(status, "no_network")
        finally:
            if old is None:
                os.environ.pop("MORPHIC_TUTOR_NO_NETWORK", None)
            else:
                os.environ["MORPHIC_TUTOR_NO_NETWORK"] = old


if __name__ == "__main__":
    if "--test" in sys.argv:
        sys.argv = [sys.argv[0]]
        unittest.main()
    else:
        run_dev_server(host="0.0.0.0", port=8787, reload=True)
