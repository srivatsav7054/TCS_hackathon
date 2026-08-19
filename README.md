# ClaimWise AI 🚀

**ClaimWise AI** is an intelligent, automated insurance claims triage system built for the TCS Hackathon. It dramatically accelerates the claims handling process by replacing manual document review with a hybrid Generative AI and deterministic rules engine. 

Instead of humans spending hours reading PDFs and cross-referencing policies, ClaimWise AI instantly extracts data, computes risk signals, looks up similar historical cases, and assigns the claim to the right team in seconds.

## 🌟 Key Features

- **Instant PDF Extraction**: Reads unstructured raw text directly from uploaded claim documents.
- **LLM Structured Parsing**: Forces messy, unstructured text into perfectly typed JSON using Pydantic.
- **Deterministic Risk Signals**: Hard-coded, flawless logic computes exactly how many SLA hours are left, flags missing documents, and spots amount limit breaches.
- **Vector RAG History**: Uses local `sentence-transformers` to find the top 3 most similar past cases to estimate fair settlement values.
- **Intelligent Triage Engine**: Analyzes the claim context to assign priority scores (0-100), risk levels, and the optimal handling department (e.g., Motor, Health, Fraud).
- **Safety Overrides**: Hardcoded guardrails ensure that highly suspicious claims are *always* escalated to Senior Review, even if the AI misjudges them.

## 🛠 Tech Stack

- **Backend Framework**: Python 3.11+, FastAPI, Uvicorn
- **AI / LLM**: Groq API (`qwen3.6-27b`) with robust auto-retry and failover to `gpt-oss-120b`
- **PDF Parsing**: PyMuPDF (`fitz`)
- **Embeddings / RAG**: `sentence-transformers` (`all-MiniLM-L6-v2`) & `scikit-learn` Cosine Similarity
- **Data Validation**: Pydantic v2
- **Database**: Local SQLite (`claims.db`)

## 🧠 Architecture

See our [architecture flow diagram](architecture.md) for a visual breakdown of the pipeline.

## 🚀 Getting Started (Local Setup)

### 1. Prerequisites
- Python 3.11+
- A valid Groq API Key

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/srivatsav7054/TCS_hackathon.git
cd TCS_hackathon/backend

# Create a virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install requirements
pip install -r requirements.txt
```

### 3. Environment Variables

Create a `.env` file inside the `backend` directory and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Run the Server

Start the FastAPI server using Uvicorn:

```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Note: On the first run, the system will automatically generate sample PDF documents and initialize the SQLite database.*

## 📡 Core API Endpoints

The backend runs locally on `http://127.0.0.1:8000`.

- `POST /api/claims/upload` - Upload a PDF claim to trigger the entire intelligent triage pipeline.
- `GET /api/claims` - List all processed claims sorted by priority score.
- `GET /api/claims/{claim_id}` - Retrieve the full details and triage report for a specific claim.
- `GET /api/claims/{claim_id}/summary` - An ultra-fast (<50ms) endpoint serving lightweight data for quick-glance UI panels.
- `POST /api/claims/{claim_id}/feedback` - Submit human handler decisions (Approve/Modify/Escalate).

## 🧪 Running Tests

We have included automated edge-case testing to prove the robustness of the system:

```bash
# Run end-to-end pipeline test
python test_e2e.py

# Run targeted edge-cases (Missing docs, Fraud overrides, Irrelevant RAG context)
python test_edge_cases.py
```
