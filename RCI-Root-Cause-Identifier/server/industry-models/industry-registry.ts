import { manufacturingRootCauseLibrary } from "./manufacturing/manufacturing-root-causes";
import { manufacturingSignals } from "./manufacturing/manufacturing-signals";
import { manufacturingBenchmarks } from "./manufacturing/manufacturing-benchmarks";
import { manufacturingMappings } from "./manufacturing/manufacturing-mappings";
import { manufacturingKPIs } from "./manufacturing/manufacturing-kpis";

export const industryRegistry = {

  manufacturing: {
    rootCauses: manufacturingRootCauseLibrary,
    signals: manufacturingSignals,
    benchmarks: manufacturingBenchmarks,
    mappings: manufacturingMappings,
    kpis: manufacturingKPIs
  }

};
