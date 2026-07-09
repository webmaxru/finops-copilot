// Ambient type declarations for the browser WebMCP surface.
//
// WebMCP exposes agent-callable tools through `document.modelContext` (Chrome
// 150+), with the deprecated `navigator.modelContext` kept as a fallback for
// older 146-149 preview builds. These types are not yet in the standard DOM
// lib, so we declare the minimal contract the integration relies on. See
// `.agents/skills/webmcp/references/webmcp-reference.md`.

export {};

declare global {
  /** A single content part of a tool result (MCP `content` shape). */
  interface ModelContextToolResultContent {
    type: string;
    text?: string;
    [key: string]: unknown;
  }

  /**
   * The value an `execute` callback resolves with. `structuredContent` carries
   * the machine-readable payload that conforms to the tool's `outputSchema`;
   * `content` carries the human/agent-readable summary.
   */
  interface ModelContextToolResult {
    content?: ModelContextToolResultContent[];
    structuredContent?: unknown;
    isError?: boolean;
    [key: string]: unknown;
  }

  /** Passed to `execute`; lets a tool request an explicit user-facing step. */
  interface ModelContextClient {
    requestUserInteraction(callback: () => Promise<unknown>): Promise<unknown>;
  }

  /** The imperative tool contract registered via `registerTool()`. */
  interface ModelContextTool {
    name: string;
    title?: string;
    description: string;
    /** JSON Schema describing the expected input; omit when there is none. */
    inputSchema?: Record<string, unknown>;
    /** JSON Schema describing the structured result this tool returns. */
    outputSchema?: Record<string, unknown>;
    annotations?: {
      readOnlyHint?: boolean;
      untrustedContentHint?: boolean;
    };
    execute(
      input: Record<string, unknown>,
      client: ModelContextClient,
    ): Promise<ModelContextToolResult> | ModelContextToolResult;
  }

  interface ModelContextRegisterOptions {
    signal?: AbortSignal;
    exposedTo?: string[];
  }

  interface ModelContext extends EventTarget {
    /** Chrome 151+ resolves the Promise once the tool is visible frame-wide. */
    registerTool(
      tool: ModelContextTool,
      options?: ModelContextRegisterOptions,
    ): Promise<void> | void;
    /** Removed in Chrome 148 in favour of the AbortSignal; optional-chained. */
    unregisterTool?(name: string): void;
    getTools?(): ModelContextTool[];
  }

  interface Document {
    readonly modelContext?: ModelContext;
  }

  interface Navigator {
    readonly modelContext?: ModelContext;
  }
}
