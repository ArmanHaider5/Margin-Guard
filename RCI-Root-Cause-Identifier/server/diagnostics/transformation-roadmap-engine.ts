import { transformationRoadmapTemplates } from "./transformation-roadmap-templates";

export function generateTransformationRoadmap(primaryRootCause: any) {
  if (!primaryRootCause) return [];

  const roadmap = transformationRoadmapTemplates[primaryRootCause.rootCause];

  if (!roadmap) return [];

  return roadmap;
}
