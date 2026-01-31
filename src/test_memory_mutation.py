import pytest
from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
import uuid

# ==============================================================================
# Mock System Components
# Based on: "Stateful Memory & Provenance Architecture"
# ==============================================================================

class MedStatus(Enum):
    ACTIVE = "active"
    DISCONTINUED = "discontinued"
    PAUSED = "paused"


class ProvenanceRecord(BaseModel):
    """
    Provenance record for tracking why and how a state mutation happened.
    """
    record_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source_turn_id: str
    source_text_snippet: str
    reasoning: str
    previous_state_hash: Optional[str] = None


class MedicationEntry(BaseModel):
    """
    Medication entity with mutable state and provenance chain.
    """
    name: str
    status: MedStatus
    dosage: Optional[str] = None
    provenance_chain: List[ProvenanceRecord] = Field(default_factory=list)

    @property
    def current_provenance(self) -> ProvenanceRecord:
        if not self.provenance_chain:
            raise ValueError("No provenance records available")
        return self.provenance_chain[-1]


class PatientProfile(BaseModel):
    """
    Stateful patient memory profile.
    """
    medications: Dict[str, MedicationEntry] = Field(default_factory=dict)

    def get_medication(self, name: str) -> Optional[MedicationEntry]:
        return self.medications.get(name.lower())


class ClinicalMemoryAgent:
    """
    Mock AI agent that mutates patient memory with provenance tracking.
    """
    def __init__(self):
        self.memory = PatientProfile()

    def process_turn(self, turn_id: str, user_input: str) -> str:
        text = user_input.lower()

        # Turn 1: "I take Advil"
        if "take" in text and "advil" in text:
            record = ProvenanceRecord(
                source_turn_id=turn_id,
                source_text_snippet="I take Advil",
                reasoning="Patient reported active medication usage.",
                previous_state_hash=None,
            )

            entry = MedicationEntry(
                name="Advil",
                status=MedStatus.ACTIVE,
                provenance_chain=[record],
            )

            self.memory.medications["advil"] = entry
            return "Recorded: Advil (Active)"

        # Turn 2: "I stopped last week"
        if "stopped" in text:
            med = self.memory.medications.get("advil")
            if med:
                prev_hash = f"hash_{med.current_provenance.record_id}"

                record = ProvenanceRecord(
                    source_turn_id=turn_id,
                    source_text_snippet="stopped last week",
                    reasoning="Patient corrected medication status to discontinued.",
                    previous_state_hash=prev_hash,
                )

                med.status = MedStatus.DISCONTINUED
                med.provenance_chain.append(record)
                return "Updated: Advil (Discontinued)"

        return "Acknowledged"


# ==============================================================================
# Test Suite
# Micro-test: Stateful Memory Mutation
# ==============================================================================

@pytest.fixture
def memory_agent():
    return ClinicalMemoryAgent()


def test_memory_mutation_medication_flow(memory_agent):
    """
    Medication lifecycle test:
    ACTIVE -> DISCONTINUED with full provenance preservation.
    """

    # ----------------------
    # Turn 1: Initial intake
    # ----------------------
    turn1_id = "turn_001"
    memory_agent.process_turn(turn1_id, "I take Advil for headaches.")

    med = memory_agent.memory.get_medication("advil")

    assert med is not None
    assert med.status == MedStatus.ACTIVE

    prov_1 = med.current_provenance
    assert prov_1.source_turn_id == turn1_id
    assert "take Advil" in prov_1.source_text_snippet
    assert prov_1.previous_state_hash is None

    # ----------------------
    # Turn 2: Correction
    # ----------------------
    turn2_id = "turn_002"
    memory_agent.process_turn(turn2_id, "Actually, I stopped taking it last week.")

    med_updated = memory_agent.memory.get_medication("advil")

    assert med_updated.status == MedStatus.DISCONTINUED
    assert len(med_updated.provenance_chain) == 2

    prov_2 = med_updated.current_provenance
    assert prov_2.source_turn_id == turn2_id
    assert "stopped" in prov_2.source_text_snippet
    assert prov_2.previous_state_hash == f"hash_{prov_1.record_id}"


def test_memory_persistence_no_hallucination(memory_agent):
    """
    Negative test:
    Ensure the agent does not invent medications.
    """
    memory_agent.process_turn("turn_x", "I feel tired today.")
    assert memory_agent.memory.get_medication("tylenol") is None
