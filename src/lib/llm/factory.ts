import type { LlmConfig, LlmProvider } from './types';
import { OpenAICompatibleProvider } from './adapters/openai-compatible';
import { AnthropicProvider } from './adapters/anthropic';
import { GeminiProvider } from './adapters/gemini';

/** Build the configured provider. Adding a provider = one case here. */
export function createLlmProvider(config: LlmConfig): LlmProvider {
  switch (config.provider) {
    case 'openai_compatible':
      return new OpenAICompatibleProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    default: {
      const exhaustive: never = config.provider;
      throw new Error(`unknown_provider: ${String(exhaustive)}`);
    }
  }
}
