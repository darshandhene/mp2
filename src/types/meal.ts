export type MealSummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  category: string;
};

export type Ingredient = {
  name: string;
  measure: string;
};

export type MealDetail = MealSummary & {
  area: string | null;
  instructions: string;
  ingredients: Ingredient[];
  sourceUrl: string | null;
  youtubeUrl: string | null;
};

export type SortKey = "name" | "category";
export type SortDirection = "asc" | "desc";
export type ViewOrigin = "list" | "gallery";

export type ViewState = {
  from: ViewOrigin;
  query: string;
  sortBy: SortKey;
  direction: SortDirection;
  categories: string[];
};

export type CatalogResult = {
  items: MealSummary[];
  failedCategories: string[];
};

export type CatalogStatus = "loading" | "ready" | "partial" | "error";

export type MealsContextValue = {
  items: MealSummary[];
  status: CatalogStatus;
  failedCategories: string[];
  error: string | null;
  retry: () => Promise<void>;
};
