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
