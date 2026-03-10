import { manufacturingRootCauseLibrary } from "./manufacturing/manufacturing-root-causes";
import { manufacturingSignals } from "./manufacturing/manufacturing-signals";
import { manufacturingBenchmarks } from "./manufacturing/manufacturing-benchmarks";
import { manufacturingMappings } from "./manufacturing/manufacturing-mappings";
import { manufacturingKPIs } from "./manufacturing/manufacturing-kpis";
import { healthcareRootCauses } from "./healthcare/healthcare-root-causes";
import { healthcareSignals } from "./healthcare/healthcare-signals";
import { healthcareBenchmarks } from "./healthcare/healthcare-benchmarks";
import { healthcareMappings } from "./healthcare/healthcare-mappings";

export const industryRegistry = {

  manufacturing: {
    rootCauses: manufacturingRootCauseLibrary,
    signals: manufacturingSignals,
    benchmarks: manufacturingBenchmarks,
    mappings: manufacturingMappings,
    kpis: manufacturingKPIs
  },

  healthcare: {
    rootCauses: healthcareRootCauses,
    signals: healthcareSignals,
    benchmarks: healthcareBenchmarks,
    mappings: healthcareMappings
  }

};
