"""AI provider abstraction.

The assistant only needs one capability: "given a system prompt and a user
message, return text". Each provider implements that, so the rest of the app
never depends on a specific vendor.

Supported providers (set AI_PROVIDER in backend/.env):
* ``anthropic``          — Claude via the official Anthropic SDK (paid API key).
* ``openai_compatible``  — any server speaking the OpenAI chat-completions
  format, e.g. a local Ollama or LM Studio instance (free, runs on your machine).
"""

import logging
from typing import Protocol

import anthropic
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5"
# Models that accept the server-side refusal fallback ("fallbacks": "default").
_FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"}


class ProviderError(Exception):
    """A failure that is safe to show to the user."""


class AIProvider(Protocol):
    name: str
    model: str

    def generate(self, system: str, user: str) -> str: ...


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, api_key: str, model: str, base_url: str | None, timeout: float):
        self.model = model or DEFAULT_ANTHROPIC_MODEL
        self._client = anthropic.Anthropic(
            api_key=api_key, base_url=base_url or None, timeout=timeout, max_retries=1
        )

    def generate(self, system: str, user: str) -> str:
        extra: dict = {}
        if self.model in _FALLBACK_MODELS and not settings.AI_BASE_URL:
            # If a safety classifier declines, Anthropic re-runs the request on
            # a suitable fallback model instead of returning a refusal.
            extra = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}
        try:
            response = self._client.beta.messages.create(
                model=self.model,
                max_tokens=8000,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_config={"effort": "medium"},
                **extra,
            )
        except anthropic.AuthenticationError as exc:
            raise ProviderError("The AI provider rejected the API key. Check AI_API_KEY.") from exc
        except anthropic.BadRequestError as exc:
            if "credit balance" in str(exc.message).lower():
                raise ProviderError(
                    "The AI provider account has run out of credit. The operator needs to add credit "
                    "in the Anthropic Console (Plans & Billing)."
                ) from exc
            logger.warning("Anthropic rejected the request: %s", exc.message)
            raise ProviderError("The AI provider rejected the request. Try again later.") from exc
        except anthropic.NotFoundError as exc:
            raise ProviderError(f"The AI model '{self.model}' was not found. Check AI_MODEL.") from exc
        except anthropic.RateLimitError as exc:
            raise ProviderError("The AI provider is rate limiting requests. Try again shortly.") from exc
        except anthropic.APITimeoutError as exc:
            raise ProviderError("The AI provider took too long to respond. Try again.") from exc
        except anthropic.APIStatusError as exc:
            logger.warning("Anthropic API error status=%s", exc.status_code)
            raise ProviderError("The AI provider returned an error. Try again later.") from exc
        except anthropic.APIConnectionError as exc:
            raise ProviderError("Could not reach the AI provider.") from exc

        if response.stop_reason == "refusal":
            raise ProviderError("The AI provider declined to answer this question.")
        text = "".join(block.text for block in response.content if block.type == "text").strip()
        if not text:
            raise ProviderError("The AI provider returned an empty answer.")
        return text


class OpenAICompatibleProvider:
    name = "openai_compatible"

    def __init__(self, api_key: str, model: str, base_url: str, timeout: float):
        if not base_url or not model:
            raise ValueError("AI_BASE_URL and AI_MODEL are required for openai_compatible")
        self.model = model
        self._url = base_url.rstrip("/") + "/chat/completions"
        self._headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self._timeout = timeout

    def generate(self, system: str, user: str) -> str:
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
        try:
            response = httpx.post(self._url, json=payload, headers=self._headers, timeout=self._timeout)
        except httpx.TimeoutException as exc:
            raise ProviderError("The AI provider took too long to respond. Try again.") from exc
        except httpx.HTTPError as exc:
            raise ProviderError("Could not reach the AI provider. Is it running?") from exc
        if response.status_code in (401, 403):
            raise ProviderError("The AI provider rejected the API key. Check AI_API_KEY.")
        if response.status_code >= 400:
            logger.warning("OpenAI-compatible provider error status=%s", response.status_code)
            raise ProviderError("The AI provider returned an error. Check AI_MODEL and AI_BASE_URL.")
        try:
            text = response.json()["choices"][0]["message"]["content"].strip()
        except (ValueError, KeyError, IndexError, TypeError, AttributeError) as exc:
            raise ProviderError("The AI provider returned an unexpected response.") from exc
        if not text:
            raise ProviderError("The AI provider returned an empty answer.")
        return text


def get_ai_provider() -> AIProvider | None:
    """Build the configured provider, or None when the assistant is disabled."""
    timeout = settings.AI_TIMEOUT_SECONDS
    if settings.AI_PROVIDER == "anthropic" and settings.AI_API_KEY:
        return AnthropicProvider(settings.AI_API_KEY, settings.AI_MODEL, settings.AI_BASE_URL, timeout)
    if settings.AI_PROVIDER == "openai_compatible" and settings.AI_BASE_URL and settings.AI_MODEL:
        return OpenAICompatibleProvider(settings.AI_API_KEY, settings.AI_MODEL, settings.AI_BASE_URL, timeout)
    return None
