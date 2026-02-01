<div align="center">
  <img width="1200" height="475" alt="Nightingale Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  <h1>Nightingale: Resilient Clinical AI Agent</h1>
  <p><strong>Safety-First Medical Triage & Patient Management System</strong></p>
</div>

## 📖 Overview

Nightingale is a clinical AI agent designed with **engineering resilience** at its core. Unlike standard chatbots, Nightingale implements a multi-layered "Defense-in-Depth" architecture to ensure clinical safety, patient privacy (PDPA/GDPR), and verifiable reasoning.

The system is validated by a suite of **13 automated micro-tests** ensuring that the AI adheres to strict medical protocols before generating any response.

**Live Demo:** [View App on AI Studio](https://ai.studio/apps/drive/1TEjOJGPt0gWMV04rm6WwyK8Z-EuxCYT_)

---

## 🛠️ Setup & Run Instructions

Follow these steps to run the application locally.

### Prerequisites
* **Node.js** (v18 or higher)
* **Python 3.10+** (Required for running the safety test suite)
* **Google Gemini API Key**

### Installation

1.  **Clone the repository and install dependencies:**
    ```bash
    git clone [your-repo-link]
    cd Nightingale
    npm install
    ```

2.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and add your API key:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

3.  **Run the Application:**
    Start the local development server:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 How to Run Tests (Clinical Safety Suite)

Nightingale utilizes a robust Python-based testing framework (`pytest`) to validate clinical compliance logic.

**1. Install Test Dependencies:**
```bash
pip install pytest pydantic
 ```
**2. Run the Test Suite**
 ```Bash
pytest -v
 ```
**3. Expected Output**
You should see 13 passing tests covering the following modules:

✅ test_risk_escalation.py: Verifies ESI triage logic (High/Medium/Low risk).

✅ test_redaction.py: Verifies PII stripping (NRIC/Names).

✅ test_access_control.py: Verifies RBAC and multi-tenant isolation.

✅ test_memory_mutation.py: Verifies stateful medication updates.

✅ test_grounding.py: Verifies RAG citations and span indices.

## 🛡️ Security & Compliance Logic
**1. Where Redaction Happens**
Redaction is implemented at the Ingress Layer (Pre-processing), strictly before data is sent to the LLM or stored in logs.

Mechanism: We utilize a deterministic engine combining Regular Expressions and Named Entity Recognition (NER).

Specific Rules:

Singapore NRIC/FIN: Regex pattern [STFG]\d{7}[A-Z] identifies and masks ID numbers.

Names: Entity extraction replaces identifiers with [REDACTED_NAME].

Verification: See src/test_redaction.py. The system asserts that raw PII never appears in the output payload or system logs to prevent data leakage.

**2. How We Enforce RBAC (Role-Based Access Control)**
Access control is enforced at the Data Access Layer using a strict "Least Privilege" model. The system distinguishes between authentication (Identity) and authorization (Permission).

Logic:

Patient Role: Can only query their own session_id. Requests to fetch data for target_id != requester_id trigger a 403 Forbidden error.

Clinician Role: Scoped to clinic_id. A clinician cannot access the triage queue of a different hospital/clinic tenant.

Implementation: Middleware intercepts every API request, decodes the user session, and validates the request against the Access Control Matrix before the logic controller processes it.

Verification: See src/test_access_control.py. Tests explicitly attempt cross-patient data access to ensure the system throws PermissionError.
