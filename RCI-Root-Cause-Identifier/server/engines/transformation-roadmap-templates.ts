export const transformationRoadmapTemplates: Record<string, { phase: string; actions: string[] }[]> = {

  "Reactive maintenance culture": [
    {
      phase: "Stabilise Operations",
      actions: [
        "Implement preventive maintenance schedule",
        "Clear maintenance backlog",
        "Ensure spare parts availability"
      ]
    },
    {
      phase: "Improve Reliability",
      actions: [
        "Introduce predictive maintenance",
        "Implement machine monitoring systems",
        "Improve maintenance planning discipline"
      ]
    },
    {
      phase: "Optimise Production",
      actions: [
        "Reduce downtime",
        "Improve production scheduling stability",
        "Reduce overtime caused by breakdown recovery"
      ]
    }
  ],

  "Production planning instability": [
    {
      phase: "Stabilise Planning",
      actions: [
        "Improve production planning discipline",
        "Reduce last-minute schedule changes",
        "Improve material availability visibility"
      ]
    },
    {
      phase: "Improve Coordination",
      actions: [
        "Synchronise procurement and production planning",
        "Improve supplier delivery reliability",
        "Improve demand forecasting"
      ]
    },
    {
      phase: "Optimise Operations",
      actions: [
        "Reduce overtime caused by schedule disruptions",
        "Improve production line balance",
        "Improve lead time predictability"
      ]
    }
  ]

};
