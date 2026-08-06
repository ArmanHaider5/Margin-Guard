import { ConfigurationError } from "../../shared/index.js";
import type { StructuredDocument, EvidenceObject } from "../../shared/index.js";
import type { CapabilityResult } from "../internal/capability-support/capability-result.js";

/**
 * One registered Capability Pack, as the orchestrator sees it — just enough
 * to run it and know what it was. `run` is deliberately typed against the
 * shared `CapabilityResult` base, not any one pack's own richer result type
 * (`LiquidityCapabilityResult`, etc.) — the orchestrator never needs a
 * pack's raw Financial Objects (`assets`, `revenue`, `cashMovements`, ...),
 * only the five `CapabilityResult` fields every pack shares.
 */
export interface CapabilityPackDescriptor {
  readonly id: string;
  readonly name: string;
  readonly run: (document: StructuredDocument, evidence: readonly EvidenceObject[]) => CapabilityResult;
}

/**
 * A data-driven registry of Capability Packs — the same
 * register()/get()/all() shape as every other registry in this module
 * (`FinancialMetricRegistry`, `FinancialSignalRuleRegistry`, ...), under the
 * same ADR-003 exception. `all()` returns packs in **registration order**,
 * which is what makes pack execution order deterministic: the default
 * registry (`createDefaultCapabilityPackRegistry()`) registers packs in a
 * fixed, documented sequence, and nothing here ever reorders them (no
 * `Set`/`Map`-keyed iteration, no sorting).
 */
export class CapabilityPackRegistry {
  private readonly packs: CapabilityPackDescriptor[] = [];
  private readonly ids = new Set<string>();

  register(pack: CapabilityPackDescriptor): void {
    if (this.ids.has(pack.id)) {
      throw new ConfigurationError(`Capability pack "${pack.id}" is already registered`, {
        details: { id: pack.id },
      });
    }
    this.ids.add(pack.id);
    this.packs.push(pack);
  }

  get(id: string): CapabilityPackDescriptor | undefined {
    return this.packs.find((p) => p.id === id);
  }

  all(): readonly CapabilityPackDescriptor[] {
    return this.packs;
  }
}
