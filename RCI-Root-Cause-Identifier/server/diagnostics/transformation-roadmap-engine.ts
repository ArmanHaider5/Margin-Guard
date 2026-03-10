export function generateTransformationRoadmap(primaryRootCause: any, supportingCauses: any[]) {
  const roadmap: { phase: string; actions: string[] }[] = [];

  if (!primaryRootCause) return roadmap;

  if (primaryRootCause.rootCause === "Reactive maintenance culture") {
    roadmap.push({
      phase: "Stabilise Operations",
      actions: [
        "Establish preventive maintenance schedule",
        "Clear existing maintenance backlog",
        "Ensure spare parts availability"
      ]
    });

    roadmap.push({
      phase: "Improve Reliability",
      actions: [
        "Introduce predictive maintenance monitoring",
        "Implement machine health tracking",
        "Improve maintenance planning processes"
      ]
    });

    roadmap.push({
      phase: "Optimise Production",
      actions: [
        "Reduce unplanned downtime",
        "Improve production scheduling stability",
        "Reduce overtime caused by breakdown recovery"
      ]
    });
  }

  if (primaryRootCause.rootCause === "Production planning instability") {
    roadmap.push({
      phase: "Stabilise Planning",
      actions: [
        "Improve production planning discipline",
        "Reduce last-minute schedule changes",
        "Improve material availability visibility"
      ]
    });

    roadmap.push({
      phase: "Improve Coordination",
      actions: [
        "Synchronise procurement and production planning",
        "Improve supplier delivery reliability",
        "Improve demand forecasting"
      ]
    });

    roadmap.push({
      phase: "Optimise Operations",
      actions: [
        "Reduce overtime from schedule disruptions",
        "Improve production line balance",
        "Improve lead time predictability"
      ]
    });
  }

  return roadmap;
}
