/**
 * Recommendation Layers Component
 * 
 * Renders recommendations from Knowledge Library archetypes.
 * Strict format: section header, bullet points, one sentence each.
 * Sections hidden if no recommendations apply.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LayerType = "immediate" | "structural" | "prevention";

interface Recommendation {
  id: string;
  text: string;
}

interface RecommendationLayer {
  type: LayerType;
  recommendations: Recommendation[];
}

interface AIRecommendationLayersProps {
  layers: RecommendationLayer[];
}

const sectionHeaders: Record<LayerType, string> = {
  immediate: "Immediate Actions",
  structural: "Structural Actions",
  prevention: "Prevention Actions",
};

function LayerSection({ layer }: { layer: RecommendationLayer }) {
  if (layer.recommendations.length === 0) {
    return null;
  }

  return (
    <div data-testid={`layer-${layer.type}`}>
      <h4 className="font-medium text-sm mb-2">{sectionHeaders[layer.type]}</h4>
      <ul className="list-disc list-inside space-y-1">
        {layer.recommendations.map((rec) => (
          <li
            key={rec.id}
            className="text-sm text-muted-foreground"
            data-testid={`rec-${rec.id}`}
          >
            {rec.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AIRecommendationLayers({ layers }: AIRecommendationLayersProps) {
  const orderedLayers = ["immediate", "structural", "prevention"]
    .map((type) => layers.find((l) => l.type === type))
    .filter((l): l is RecommendationLayer => l !== undefined && l.recommendations.length > 0);

  if (orderedLayers.length === 0) {
    return null;
  }

  return (
    <Card data-testid="ai-recommendation-layers">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Recommended Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orderedLayers.map((layer) => (
            <LayerSection key={layer.type} layer={layer} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export type { RecommendationLayer, Recommendation, LayerType };
