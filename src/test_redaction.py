import pytest
import re
import logging
from typing import List

# ==============================================================================
# 1. Redaction Engine Implementation (Simulated for Testing)
# Based on "Microsoft Presidio Integration" and "NRIC Regex" documents
# ==============================================================================

class RedactionEngine:
    """
    Simulates a PII Scrubber using Regex and Named Entity Recognition (NER).
    Ref: "Preventing PII leakage when using LLMs: An introduction to Microsoft's Presidio"
    """
    def __init__(self):
        # Regex for Singapore NRIC/FIN as found in your notebook documents
        self.nric_pattern = r'[STFG]\d{7}[A-Z]'
        # Simple Name Pattern (In production, this would be an NER model like spaCy/Presidio)
        self.name_pattern = r'John Doe|Jane Doe'
        self.logger = logging.getLogger("RedactionEngine")

    def redact(self, text: str) -> str:
        self.logger.info(f"Processing text for redaction. Original length: {len(text)}")
        
        # ⚠️ VULNERABILITY CHECK: Log the redaction process without leaking raw values
        redacted_text = text
        
        # Redact NRIC
        if re.search(self.nric_pattern, text, re.IGNORECASE):
            redacted_text = re.sub(self.nric_pattern, "[REDACTED_IC]", redacted_text, flags=re.IGNORECASE)
            self.logger.info("Sensitive Identity Card (IC) detected and redacted.")

        # Redact Names
        if re.search(self.name_pattern, text, re.IGNORECASE):
            redacted_text = re.sub(self.name_pattern, "[REDACTED_NAME]", redacted_text, flags=re.IGNORECASE)
            self.logger.info("Personal Name detected and redacted.")

        return redacted_text

# ==============================================================================
# 2. Automated Test Suite
# ==============================================================================

@pytest.fixture
def engine():
    return RedactionEngine()

def test_pii_redaction_flow(engine, caplog):
    """
    Test Case: Verify that names and ICs are redacted from LLM input and logs.
    Input: "My name is John Doe and my IC is S1234567A."
    """
    # 1. Arrange
    raw_input = "My name is John Doe and my IC is S1234567A."
    raw_name = "John Doe"
    raw_ic = "S1234567A"

    # 2. Act
    # Set logging level to capture the engine's activities
    with caplog.at_level(logging.INFO):
        processed_text = engine.redact(raw_input)

    # 3. Assertions: LLM Input Integrity
    # "Assert the LLM input contains [REDACTED] for those fields"
    assert "[REDACTED_NAME]" in processed_text
    assert "[REDACTED_IC]" in processed_text
    assert raw_name not in processed_text, f"Leak detected: Name '{raw_name}' sent to LLM!"
    assert raw_ic not in processed_text, f"Leak detected: IC '{raw_ic}' sent to LLM!"

    # 4. Assertions: Log Security (Audit Trail)
    # "Assert logs do not contain the raw values"
    log_content = caplog.text
    
    # Check that we didn't accidentally log the user's secrets
    assert raw_name not in log_content, "Security Failure: Raw name leaked into system logs!"
    assert raw_ic not in log_content, "Security Failure: Raw IC leaked into system logs!"
    
    # Check that the logs confirm redaction happened
    assert "detected and redacted" in log_content
    print(f"\nRedacted Output: {processed_text}")

def test_redaction_no_over_scrubbing(engine):
    """
    Negative Test: Ensure non-PII medical terms are NOT redacted.
    """
    medical_input = "The patient has a cough."
    output = engine.redact(medical_input)
    assert output == medical_input, "Over-scrubbing detected: Non-PII was removed."
