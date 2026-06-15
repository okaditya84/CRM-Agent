import type {
  GenerateStructuredArgs,
  GenerateStructuredResult,
  LlmProvider,
  LlmProviderKind,
} from './types';

/**
 * Scripted LlmProvider for tests. Pass either a fixed list of responses (consumed
 * in order) or a function of the call args. Records every call for assertions.
 */
export class FakeLlmProvider implements LlmProvider {
  readonly kind: LlmProviderKind = 'openai_compatible';
  public calls: GenerateStructuredArgs[] = [];
  private index = 0;

  constructor(
    private readonly responses: unknown[] | ((args: GenerateStructuredArgs, call: number) => unknown),
  ) {}

  async generateStructured(args: GenerateStructuredArgs): Promise<GenerateStructuredResult> {
    const call = this.index++;
    this.calls.push(args);
    const raw =
      typeof this.responses === 'function'
        ? this.responses(args, call)
        : (this.responses[Math.min(call, this.responses.length - 1)] ?? {});
    return { raw };
  }
}
