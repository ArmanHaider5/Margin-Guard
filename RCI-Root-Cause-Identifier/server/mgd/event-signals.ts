// ─────────────────────────────────────────────────────────────────────────────
// MGD EVENT SIGNAL ENGINE
//
// Computes event-management-specific operational metrics from CIL transaction
// data.  Called once per pipeline run before findings generation so that EM
// detectors receive pre-computed rates and composite scores.
//
// All rates are expressed as 0–1 fractions.  Composite scores are 0–100.
// Never throws — returns a neutral default object on bad input.
// ─────────────────────────────────────────────────────────────────────────────

export interface EventSignals {
  // ── Dispatch reliability ──────────────────────────────────────────────────
  dispatchFailureRate:      number;   // incomplete dispatches / total dispatches
  dispatchDelayRate:        number;   // delayed dispatches / total dispatches (alias: deliveryDelayRate)
  deliveryDelayRate:        number;   // same as dispatchDelayRate (legacy name kept for internal detectors)
  averageDelayMinutes:      number;   // mean minutes across delayed dispatches
  substitutionRate:         number;   // substitutions / total dispatched items
  missingItemRate:          number;   // missing items / total dispatched items (alias: inventoryShortageRate)
  inventoryShortageRate:    number;   // same as missingItemRate (legacy name kept for internal detectors)

  // ── Asset management ──────────────────────────────────────────────────────
  assetDamageRate:          number;   // damage events / distinct assets seen
  damageRecoveryRate:       number;   // recovered events / total damage events
  unrecoveredDamageRate:    number;   // unrecovered events / total damage events (= 1 − damageRecoveryRate)
  unrecoveredDamageValue:   number;   // RM value unrecovered

  // ── Composite scores (0–100) ──────────────────────────────────────────────
  inventoryVisibilityScore:   number;
  eventReadinessScore:        number;
  dispatchReliabilityScore:   number;   // 100 = no failures/delays; lower = worse
  assetAccountabilityScore:   number;   // 100 = full recovery or no damage; lower = worse

  // ── Financial exposure estimates ──────────────────────────────────────────
  averageEventValue:           number;   // RM — mean value per dispatch event
  estimatedRevenueExposure:    number;   // totalMissingItems × averageEventValue
  dispatchFailureExposure:     number;   // incompleteDispatches × averageEventValue
  assetDamageExposure:         number;   // alias for totalDamageValue (total recorded damage)

  // ── Raw counts (for trace and debug) ─────────────────────────────────────
  totalDispatches:          number;
  incompleteDispatches:     number;
  totalMissingItems:        number;
  totalDispatchedItems:     number;
  totalSubstitutions:       number;
  delayedDispatches:        number;
  totalDamageEvents:        number;
  recoveredDamageEvents:    number;
  totalDamageValue:         number;
  recoveredDamageValue:     number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeNum(v: any): number {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function rate(n: number, d: number): number {
  return d > 0 ? Math.min(1, n / d) : 0;
}

/**
 * Extract the value for a given column key from rawText.
 * rawText is formatted as "ColA: val | ColB: val | ..."
 */
function extract(rawText: string, key: string): string | null {
  if (!rawText || !key) return null;
  // Case-insensitive search for "key: value"
  const pattern = new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^|]+)`, "i");
  const m = rawText.match(pattern);
  return m ? m[1].trim() : null;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Compute event-management operational signals from the full transaction array.
 * Returns a neutral (zero/100) EventSignals object when transactions is empty.
 */
export function computeEventSignals(transactions: any[]): EventSignals {
  const NEUTRAL: EventSignals = {
    dispatchFailureRate: 0, dispatchDelayRate: 0, deliveryDelayRate: 0,
    averageDelayMinutes: 0, substitutionRate: 0,
    missingItemRate: 0, inventoryShortageRate: 0,
    assetDamageRate: 0, damageRecoveryRate: 1,
    unrecoveredDamageRate: 0, unrecoveredDamageValue: 0,
    inventoryVisibilityScore: 100, eventReadinessScore: 100,
    dispatchReliabilityScore: 100, assetAccountabilityScore: 100,
    averageEventValue: 0, estimatedRevenueExposure: 0,
    dispatchFailureExposure: 0, assetDamageExposure: 0,
    totalDispatches: 0, incompleteDispatches: 0, totalMissingItems: 0,
    totalDispatchedItems: 0, totalSubstitutions: 0, delayedDispatches: 0,
    totalDamageEvents: 0, recoveredDamageEvents: 0,
    totalDamageValue: 0, recoveredDamageValue: 0,
  };

  if (!Array.isArray(transactions) || transactions.length === 0) return NEUTRAL;

  let totalDispatches      = 0;
  let incompleteDispatches = 0;
  let totalMissingItems    = 0;
  let totalDispatchedItems = 0;
  let totalSubstitutions   = 0;
  let delayedDispatches    = 0;
  const delayMinutesList: number[] = [];

  const assetsSeen = new Set<string>();
  let totalDamageEvents    = 0;
  let recoveredDamageEvents = 0;
  let totalDamageValue     = 0;
  let recoveredDamageValue = 0;

  let adjustmentCount    = 0;
  let hasReconciliation  = false;
  let discrepancySignals = 0;

  let totalEventValue  = 0;   // sum of value across dispatch rows with value > 0
  let eventValueCount  = 0;   // count of dispatch rows with value > 0

  for (const tx of transactions) {
    if (!tx || typeof tx !== "object") continue;

    const type    = String(tx.transactionType ?? "").toLowerCase();
    const rawText = String(tx.rawText ?? "");
    const rawLc   = rawText.toLowerCase();
    const qty     = safeNum(tx.quantity);
    const val     = safeNum(tx.value);
    const entity  = String(tx.entityName ?? "").trim();

    // ── Dispatch / missing-item signals ──────────────────────────────────────
    const isDispatchRow =
      type === "dispatch_event" ||
      type === "inventory_loss" ||
      /dispatch complete|missing items|delay mins/i.test(rawText);

    if (isDispatchRow) {
      totalDispatches++;

      // Incomplete dispatch: "Dispatch Complete?: No"
      const dispVal = extract(rawText, "Dispatch Complete?") ?? extract(rawText, "Dispatch Complete");
      if (dispVal && /^no$/i.test(dispVal)) incompleteDispatches++;

      // Missing items: from qty (mapped from "Missing Items" column) or rawText
      const missing = (type === "inventory_loss" || /missing items/i.test(rawText))
        ? (qty > 0 ? qty : safeNum(extract(rawText, "Missing Items") ?? "0"))
        : 0;
      totalMissingItems    += missing;
      totalDispatchedItems += qty > 0 ? qty : 1;

      // Event value (revenue per event row)
      if (val > 0) { totalEventValue += val; eventValueCount++; }

      // Substitutions
      const subVal = extract(rawText, "Substitutions") ?? extract(rawText, "Substitution");
      if (subVal) totalSubstitutions += safeNum(subVal);

      // Delay minutes
      const delayVal = extract(rawText, "Delay Mins") ?? extract(rawText, "Delay Minutes");
      const delayMins = safeNum(delayVal ?? "0") ||
        (type === "dispatch_event" && qty > 0 ? qty : 0);
      if (delayMins > 0) {
        delayedDispatches++;
        delayMinutesList.push(delayMins);
      }
    }

    // ── Asset damage signals ──────────────────────────────────────────────────
    const isDamageRow =
      type === "asset_damage" ||
      /damage type|charge recovered|damage cost/i.test(rawText);

    if (isDamageRow) {
      totalDamageEvents++;
      if (entity) assetsSeen.add(entity.toLowerCase());

      // "Charge Recovered?" column → Yes/No
      const recVal = extract(rawText, "Charge Recovered?") ?? extract(rawText, "Charge Recovered");
      // "Recovery Amount" column → explicit RM amount recovered
      const recAmountRaw = extract(rawText, "Recovery Amount") ?? extract(rawText, "Amount Recovered");
      const recAmount    = safeNum(recAmountRaw ?? "");

      const isRecovered = recVal ? /^yes$/i.test(recVal) : recAmount > 0;
      if (isRecovered) {
        recoveredDamageEvents++;
        // Use explicit Recovery Amount when available; fall back to full damage value
        recoveredDamageValue += recAmount > 0 ? recAmount : val;
      }
      totalDamageValue += val;
    }

    // ── Inventory visibility signals ──────────────────────────────────────────
    if (type === "adjustment") adjustmentCount++;
    if (/reconcil|cycle count|stock take|stock count|physical audit/i.test(rawLc)) {
      hasReconciliation = true;
    }
    if (/discrepan|mismatch|variance|short(?:age)?|missing/i.test(rawLc)) {
      discrepancySignals++;
    }
  }

  // ── Rate calculations ─────────────────────────────────────────────────────

  const dispatchFailureRate   = rate(incompleteDispatches, totalDispatches);
  const inventoryShortageRate = rate(totalMissingItems, totalDispatchedItems);
  const missingItemRate       = inventoryShortageRate;   // canonical name per spec
  const substitutionRate      = rate(totalSubstitutions, Math.max(totalDispatchedItems, 1));
  const deliveryDelayRate     = rate(delayedDispatches, totalDispatches);
  const dispatchDelayRate     = deliveryDelayRate;        // canonical name per spec
  const averageDelayMinutes   = delayMinutesList.length > 0
    ? delayMinutesList.reduce((s, v) => s + v, 0) / delayMinutesList.length
    : 0;
  const assetDamageRate       = assetsSeen.size > 0
    ? Math.min(1, totalDamageEvents / assetsSeen.size) : 0;
  const damageRecoveryRate    = totalDamageEvents > 0
    ? rate(recoveredDamageEvents, totalDamageEvents) : 1;
  const unrecoveredDamageRate = 1 - damageRecoveryRate;  // fraction unrecovered
  const unrecoveredDamageValue = Math.max(0, totalDamageValue - recoveredDamageValue);

  // ── Composite scores ──────────────────────────────────────────────────────

  // Inventory Visibility Score (100 = perfect, lower = worse)
  let invScore = 100;
  if (adjustmentCount > 5)          invScore -= 15;
  if (adjustmentCount > 20)         invScore -= 15;
  if (discrepancySignals > 0)       invScore -= Math.min(30, discrepancySignals * 5);
  if (!hasReconciliation)           invScore -= 10;
  if (inventoryShortageRate > 0.03) invScore -= 15;
  const inventoryVisibilityScore = Math.max(0, Math.min(100, Math.round(invScore)));

  // Event Readiness Score (canonical formula)
  const failurePenalty      = dispatchFailureRate * 300;   // rate 0-1 → penalty 0-300, clamped at 100
  const delayPenalty        = dispatchDelayRate   * 200;
  const substitutionPenalty = substitutionRate    * 150;
  const missingPenalty      = missingItemRate     * 400;
  const eventReadinessScore = Math.max(0, Math.min(100, Math.round(
    100 - failurePenalty - delayPenalty - substitutionPenalty - missingPenalty,
  )));

  // Dispatch Reliability Score — penalises failures and delays independently
  const dispatchReliabilityScore = Math.max(0, Math.min(100, Math.round(
    100 - dispatchFailureRate * 200 - dispatchDelayRate * 100,
  )));

  // Asset Accountability Score — based on damage recovery rate; 100 when no damage
  const assetAccountabilityScore = totalDamageEvents === 0
    ? 100
    : Math.max(0, Math.min(100, Math.round(damageRecoveryRate * 100)));

  // ── Financial exposure estimates ──────────────────────────────────────────

  const averageEventValue        = eventValueCount > 0
    ? Math.round(totalEventValue / eventValueCount) : 0;
  const estimatedRevenueExposure = Math.round(totalMissingItems  * averageEventValue);
  const dispatchFailureExposure  = Math.round(incompleteDispatches * averageEventValue);
  const assetDamageExposure      = Math.round(totalDamageValue);   // total recorded damage RM

  return {
    dispatchFailureRate,
    dispatchDelayRate,
    deliveryDelayRate,
    averageDelayMinutes,
    substitutionRate,
    missingItemRate,
    inventoryShortageRate,
    assetDamageRate,
    damageRecoveryRate,
    unrecoveredDamageRate,
    unrecoveredDamageValue,
    inventoryVisibilityScore,
    eventReadinessScore,
    dispatchReliabilityScore,
    assetAccountabilityScore,
    averageEventValue,
    estimatedRevenueExposure,
    dispatchFailureExposure,
    assetDamageExposure,
    totalDispatches,
    incompleteDispatches,
    totalMissingItems,
    totalDispatchedItems,
    totalSubstitutions,
    delayedDispatches,
    totalDamageEvents,
    recoveredDamageEvents,
    totalDamageValue,
    recoveredDamageValue,
  };
}
