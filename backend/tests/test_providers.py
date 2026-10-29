"""Provider error handling, without calling the real API."""

import anthropic
import httpx
import pytest

from app.ai.providers import AnthropicProvider, ProviderError


def _bad_request(message: str) -> anthropic.BadRequestError:
    response = httpx.Response(400, request=httpx.Request("POST", "https://api.anthropic.com/v1/messages"))
    return anthropic.BadRequestError(message, response=response, body={"error": {"message": message}})


@pytest.mark.parametrize(
    ("api_message", "expected"),
    [
        ("Your credit balance is too low to access the Anthropic API.", "run out of credit"),
        ("messages: field required", "rejected the request"),
    ],
)
def test_bad_requests_become_clear_messages(monkeypatch, api_message, expected):
    provider = AnthropicProvider(api_key="sk-ant-test", model="", base_url=None, timeout=5)

    def fail(**_kwargs):
        raise _bad_request(api_message)

    monkeypatch.setattr(provider._client.beta.messages, "create", fail)
    with pytest.raises(ProviderError, match=expected):
        provider.generate("system", "user")
