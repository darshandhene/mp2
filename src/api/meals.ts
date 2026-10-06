import axios from "axios";
import type { CatalogResult, MealDetail, MealSummary } from "../types/meal.ts";

const api = axios.create({
  baseURL: "https://www.themealdb.com/api/json/v1/1/",
  timeout: 12000,
});

const CATEGORY_CONCURRENCY = 4;

let categoryNames: string[] | null = null;
let categoryNamesRequest: Promise<string[]> | null = null;
const mealsByCategory = new Map<string, MealSummary[]>();
const categoryRequests = new Map<string, Promise<MealSummary[]>>();
const detailsById = new Map<string, MealDetail | null>();
const detailRequests = new Map<string, Promise<MealDetail | null>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function httpUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return null;
  }
  return null;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

export function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") return "The request timed out.";
    return "The meal service could not be reached.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "The meal service could not be reached.";
}

async function fetchCategoryNames(): Promise<string[]> {
  const response = await api.get<unknown>("categories.php");
  const data = response.data;
  if (!isRecord(data) || !Array.isArray(data.categories)) {
    throw new Error("The category list from TheMealDB was not usable.");
  }
  const names = data.categories
    .filter(isRecord)
    .map((category) => readString(category, "strCategory"))
    .filter((name) => name.length > 0);
  return [...new Set(names)];
}

function getCategoryNames(): Promise<string[]> {
  if (categoryNames) return Promise.resolve(categoryNames);
  if (!categoryNamesRequest) {
    categoryNamesRequest = fetchCategoryNames()
      .then((names) => {
        categoryNames = names;
        categoryNamesRequest = null;
        return names;
      })
      .catch((error: unknown) => {
        categoryNamesRequest = null;
        throw error;
      });
  }
  return categoryNamesRequest;
}

function summaryFromFilter(record: Record<string, unknown>, category: string): MealSummary | null {
  const id = readString(record, "idMeal");
  const name = readString(record, "strMeal");
  if (!id || !name) return null;
  const image = readString(record, "strMealThumb");
  return { id, name, imageUrl: image || null, category };
}

async function fetchCategoryMeals(category: string): Promise<MealSummary[]> {
  const response = await api.get<unknown>("filter.php", { params: { c: category } });
  const data = response.data;
  if (!isRecord(data) || (data.meals !== null && !Array.isArray(data.meals))) {
    throw new Error(`Meals for ${category} were not usable.`);
  }
  if (data.meals === null) return [];
  return data.meals
    .filter(isRecord)
    .map((meal) => summaryFromFilter(meal, category))
    .filter((meal): meal is MealSummary => meal !== null);
}

function getCategoryMeals(category: string): Promise<MealSummary[]> {
  const cached = mealsByCategory.get(category);
  if (cached) return Promise.resolve(cached);
  let request = categoryRequests.get(category);
  if (!request) {
    request = fetchCategoryMeals(category)
      .then((meals) => {
        mealsByCategory.set(category, meals);
        categoryRequests.delete(category);
        return meals;
      })
      .catch((error: unknown) => {
        categoryRequests.delete(category);
        throw error;
      });
    categoryRequests.set(category, request);
  }
  return request;
}

async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item !== undefined) results[index] = await worker(item);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function loadCatalog(): Promise<CatalogResult> {
  const names = await getCategoryNames();
  const settled = await mapPool(names, CATEGORY_CONCURRENCY, async (category) => {
    try {
      const meals = await getCategoryMeals(category);
      return { category, meals, failed: false };
    } catch {
      return { category, meals: [] as MealSummary[], failed: true };
    }
  });

  const byId = new Map<string, MealSummary>();
  const failedCategories: string[] = [];
  for (const result of settled) {
    if (result.failed) failedCategories.push(result.category);
    for (const meal of result.meals) {
      const existing = byId.get(meal.id);
      if (!existing || compareText(meal.category, existing.category) < 0) {
        byId.set(meal.id, meal);
      }
    }
  }

  const items = [...byId.values()].sort(
    (left, right) => compareText(left.name, right.name) || compareText(left.id, right.id),
  );
  return { items, failedCategories };
}

function detailFromLookup(record: Record<string, unknown>): MealDetail | null {
  const id = readString(record, "idMeal");
  const name = readString(record, "strMeal");
  if (!id || !name) return null;
  const ingredients: MealDetail["ingredients"] = [];
  for (let slot = 1; slot <= 20; slot += 1) {
    const nameSlot = readString(record, `strIngredient${slot}`);
    if (!nameSlot) continue;
    ingredients.push({ name: nameSlot, measure: readString(record, `strMeasure${slot}`) });
  }
  const image = readString(record, "strMealThumb");
  const area = readString(record, "strArea");
  const category = readString(record, "strCategory");
  return {
    id,
    name,
    imageUrl: image || null,
    category: category || "Uncategorized",
    area: area || null,
    instructions: readString(record, "strInstructions").replaceAll("\r\n", "\n"),
    ingredients,
    sourceUrl: httpUrl(readString(record, "strSource")),
    youtubeUrl: httpUrl(readString(record, "strYoutube")),
  };
}

async function fetchMeal(id: string): Promise<MealDetail | null> {
  const response = await api.get<unknown>("lookup.php", { params: { i: id } });
  const data = response.data;
  if (!isRecord(data) || (data.meals !== null && !Array.isArray(data.meals))) {
    throw new Error("The recipe from TheMealDB was not usable.");
  }
  if (data.meals === null || data.meals.length === 0) return null;
  const meal = data.meals[0];
  if (!isRecord(meal)) throw new Error("The recipe from TheMealDB was not usable.");
  return detailFromLookup(meal);
}

export function getMeal(id: string): Promise<MealDetail | null> {
  const key = id.trim();
  if (!key) return Promise.resolve(null);
  if (detailsById.has(key)) return Promise.resolve(detailsById.get(key) ?? null);
  let request = detailRequests.get(key);
  if (!request) {
    request = fetchMeal(key)
      .then((meal) => {
        detailsById.set(key, meal);
        detailRequests.delete(key);
        return meal;
      })
      .catch((error: unknown) => {
        detailRequests.delete(key);
        throw error;
      });
    detailRequests.set(key, request);
  }
  return request;
}
