// Imperative WebMCP tool registration helper.
//
// Adapted from the webmcp skill asset `model-context-registry.template.ts`.
// Resolves the model context with the documented feature-detection pattern
// (`document.modelContext` first, deprecated `navigator.modelContext` fallback),
// registers each tool under a shared AbortController, and awaits registration
// inside a try/catch so it works on both the synchronous (<=150) and
// Promise-returning (151+) Chrome builds. See
// `.agents/skills/webmcp/references/webmcp-reference.md`.

/** Resolve the per-document model context, or null when WebMCP is unavailable. */
export function resolveModelContext(): ModelContext | null {
  const fromDocument =
    typeof document !== 'undefined' ? document.modelContext : undefined;
  const fromNavigator =
    typeof navigator !== 'undefined' ? navigator.modelContext : undefined;
  return fromDocument ?? fromNavigator ?? null;
}

export interface WebMcpRegistration {
  /** Resolves once every tool has settled its registration (or logged failure). */
  ready: Promise<void>;
  /** Synchronous cleanup, safe to use directly as framework effect teardown. */
  dispose: () => void;
}

/**
 * Register a set of imperative tools. Returns a `dispose()` that unregisters
 * them (via `unregisterTool` where still supported, then aborting the signal)
 * and a `ready` promise for callers that need registration to have settled.
 * A no-op (with an already-resolved `ready`) when WebMCP is unavailable.
 */
export function registerWebMcpTools(tools: ModelContextTool[]): WebMcpRegistration {
  const modelContext = resolveModelContext();
  if (!modelContext) {
    return { ready: Promise.resolve(), dispose: () => {} };
  }

  const controller = new AbortController();
  const registeredNames: string[] = [];

  // Register concurrently: each tool keeps its own try/catch so one failing
  // registration never abandons the others, and `await` stays correct on older
  // builds that registered synchronously (Promise.resolve(undefined) awaits
  // fine). The try/catch catches both synchronous throws and 151+ rejections.
  const ready = Promise.all(
    tools.map(async (tool) => {
      try {
        await modelContext.registerTool(tool, { signal: controller.signal });
        registeredNames.push(tool.name);
      } catch (error) {
        console.error(`Failed to register WebMCP tool "${tool.name}":`, error);
      }
    }),
  ).then(() => undefined);

  return {
    ready,
    dispose() {
      // Transitional: `unregisterTool` is removed in Chrome 148+, where the
      // aborted signal handles unregistration. Call both for cross-version safety.
      for (const name of registeredNames.splice(0).reverse()) {
        try {
          modelContext.unregisterTool?.(name);
        } catch {
          /* ignore stale cleanup during route/state transitions */
        }
      }
      controller.abort();
    },
  };
}
