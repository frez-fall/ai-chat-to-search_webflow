// webflow-components/src/types/destinations.ts
export type DestinationRecommendation = {
  code: string;            // e.g. "NRT"
  name: string;            // e.g. "Tokyo"
  country?: string;
  group?: string;          // e.g. "Asia", "Popular", etc.
  description?: string;
  imageUrl?: string;
  tags?: string[];
};

export type GroupedDestinations = Record<string, DestinationRecommendation[]>;