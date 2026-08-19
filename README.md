# ClaimWise AI - Integrated Application (Frontend + Backend)

This repository contains the integrated solution for ClaimWise AI, a cutting-edge insurance claims triage application built during the TCS AI Hackathon.

## Structure

*   ackend/: Contains the FastAPI backend application, powered by Python, utilizing Groq/OpenAI for LLM operations, PyMuPDF for document extraction, and SentenceTransformers for semantic retrieval.
*   claimwise-ai/: Contains the React/Vite frontend application, showcasing a premium, modern dashboard interface for claims handlers and administrators.

## Features

*   **Automated AI Triage:** Ingests claims, extracts text from PDFs, calculates risk/priority signals, retrieves similar past claims for context, and uses LLMs to intelligently route and score claims.
*   **Modern Frontend:** A beautiful, responsive dashboard built with React, featuring role-based views (Admin, Motor, Health, Property, Life, Fraud).
*   **Document Viewer:** Integrated PDF viewing capability for verifying claim documents directly within the dashboard.
*   **Workflow Management:** Claim lifecycle tracking with approval, rejection, escalation, and review actions.

## Setup Instructions

### Prerequisites
1. You will need API keys for the AI extraction. Rename ackend/.env.example to ackend/.env and insert your API keys:
   - GROQ_API_KEY (Required for primary fast processing)
   - OPENAI_API_KEY (Optional fallback for complex cases)

### Backend
1. Navigate to the ackend/backend directory.
2. Install dependencies: pip install -r requirements.txt (or equivalent).
3. Start the server: 
   `ash
   python main.py
   `
   *(Note: The repository includes a pre-populated SQLite database (data/claimwise.db) containing 12 processed claims so you can view the dashboard immediately without re-running the extraction pipeline).*
   The backend will start at http://localhost:8000

### Frontend
1. Navigate to the claimwise-ai directory.
2. Install dependencies: 
pm install
3. Start the development server: 
pm run dev
   The frontend will be available at http://localhost:5173

## Architecture Highlights
- Uses a local SQLite database (claimwise.db) for persistence.
- Employs a fallback model architecture to guarantee uptime and reliability during LLM API turbulence.
- The claimwise-ai/src/api/claimsApi.js is set to point to the real backend (MOCK_MODE = false).
