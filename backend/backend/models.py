"""Pydantic v2 schemas for ClaimWise AI."""

from pydantic import BaseModel, Field
from enum import Enum


class Complexity(str, Enum):
    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"


class Criticality(str, Enum):
    normal = "NORMAL"
    urgent = "URGENT"
    critical = "CRITICAL"


class Team(str, Enum):
    motor = "Motor Claims"
    health = "Health Claims"
    property = "Property Claims"
    life = "Life Claims"
    fraud = "Fraud Investigation"
    senior = "Senior/Complex Review"


class StructuredClaim(BaseModel):
    claim_id: str
    claim_type: str
    claim_amount: float
    policy_limit: float
    incident_date: str
    policy_number: str
    narrative: str
    submitted_documents: list[str]
    required_documents: list[str]
    sla_hours: int
    hours_remaining: int
    previous_claims: int = 0
    document_urls: dict[str, str] = {}


class TriageResult(BaseModel):
    claim_id: str
    claim_type: str
    complexity: Complexity
    criticality: Criticality
    confidence_score: int = Field(ge=0, le=100)
    assigned_team: Team
    team_assignment_reason: str
    priority_score: int = Field(ge=0, le=100)
    priority_reason: str
    risk_score: int = Field(ge=0, le=100)
    risk_factors: list[str] = []
    missing_documents: list[str] = []
    current_state_summary: str
    comparable_cases: list[str] = []
    settlement_low: float | None = None
    settlement_high: float | None = None
    settlement_justification: str | None = None
    next_best_action: list[str]
    reasoning: str
