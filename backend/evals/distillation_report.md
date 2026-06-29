# Prompt Distillation — Before / After (100 reviews)

- **Teacher:** `gpt-5.5` (dev-time only)
- **Student:** `qwen/qwen3-30b-a3b-instruct-2507` (runtime)
- **Compared on:** 100 reviews

| Stage | Agreement with teacher |
|---|---|
| Before distillation | 93.0% |
| After distillation | 94.0% |
| **Improvement** | **+1.0 pp** |

10 few-shot examples distilled (7 student mistakes corrected). The few-shots are saved to `app/insights/prompts/classify_fewshot.json` and injected into the runtime classify prompt.
