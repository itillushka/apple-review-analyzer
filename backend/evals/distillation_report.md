# Prompt Distillation — Before / After (100 reviews)

- **Teacher:** `gpt-5.5` (dev-time only)
- **Student:** `tencent/hy3-preview` (runtime)
- **Compared on:** 100 reviews

| Stage | Agreement with teacher |
|---|---|
| Before distillation | 95.0% |
| After distillation | 97.0% |
| **Improvement** | **+2.0 pp** |

10 few-shot examples distilled (5 student mistakes corrected). The few-shots are saved to `app/insights/prompts/classify_fewshot.json` and injected into the runtime classify prompt.
