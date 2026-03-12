import { manufacturingRootCauseLibrary } from "./manufacturing/manufacturing-root-causes";
import { manufacturingSignals } from "./manufacturing/manufacturing-signals";
import { manufacturingBenchmarks } from "./manufacturing/manufacturing-benchmarks";
import { manufacturingMappings } from "./manufacturing/manufacturing-mappings";
import { manufacturingKPIs } from "./manufacturing/manufacturing-kpis";
import { healthcareRootCauses } from "./healthcare/healthcare-root-causes";
import { healthcareSignals } from "./healthcare/healthcare-signals";
import { healthcareBenchmarks } from "./healthcare/healthcare-benchmarks";
import { healthcareMappings } from "./healthcare/healthcare-mappings";
import { logisticsRootCauses } from "./logistics/logistics-root-causes";
import { logisticsSignals } from "./logistics/logistics-signals";
import { logisticsBenchmarks } from "./logistics/logistics-benchmarks";
import { logisticsMappings } from "./logistics/logistics-mappings";
import { retailRootCauses } from "./retail/retail-root-causes";
import { retailSignals } from "./retail/retail-signals";
import { retailBenchmarks } from "./retail/retail-benchmarks";
import { retailMappings } from "./retail/retail-mappings";
import { professionalServicesRootCauses } from "./professional-services/professional-services-root-causes";
import { professionalServicesSignals } from "./professional-services/professional-services-signals";
import { professionalServicesBenchmarks } from "./professional-services/professional-services-benchmarks";
import { professionalServicesMappings } from "./professional-services/professional-services-mappings";

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
  },

  logistics: {
    rootCauses: logisticsRootCauses,
    signals: logisticsSignals,
    benchmarks: logisticsBenchmarks,
    mappings: logisticsMappings
  },

  retail: {
    rootCauses: retailRootCauses,
    signals: retailSignals,
    benchmarks: retailBenchmarks,
    mappings: retailMappings
  },

  professionalServices: {
    rootCauses: professionalServicesRootCauses,
    signals: professionalServicesSignals,
    benchmarks: professionalServicesBenchmarks,
    mappings: professionalServicesMappings
  }

};
