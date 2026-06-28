# Apple Store Review Analysis

A system that collects user reviews from the Apple App Store for a given app, processes
them, and produces metrics and AI-generated insights — exposed through a REST API and a
web dashboard.

> Built as a technical assignment for OBRIO (Genesis). 🚧 Work in progress.

## What it does

- Collects ~100 reviews for any App Store app via Apple's **public reviews RSS feed**
  (no API key required).
- Cleans and preprocesses the review text.
- Computes metrics: average rating, rating distribution, rating by app version, trend over
  time, sentiment distribution, and top issues in negative reviews.
- Generates insights via NLP/LLM: sentiment analysis, common themes in negative reviews,
  and actionable recommendations.
- Serves everything through a REST API and a styled web frontend, with raw-data download
  (JSON / CSV).

## Architecture (planned)

- **Backend:** Python · FastAPI · LangGraph (insights pipeline) · Langfuse (LLM observability)
- **AI:** OpenRouter (multi-model routing) with a local NLP fallback (VADER + YAKE) so the
  core runs without any external service
- **Frontend:** React · Vite · Tailwind · Recharts
- **Data source:** Apple App Store public reviews RSS
- **Deployment:** Docker Compose

## Status

In active development. Setup and usage instructions will land here as the API takes shape.
