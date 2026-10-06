import type { Page, Route } from "@playwright/test";

// Deterministic stand-in for TheMealDB so browser tests never depend on the live API.
// 40 recipes across five categories: enough to cross a 24-item page boundary.

type Meal = { idMeal: string; strMeal: string; strMealThumb: string };

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function meals(prefix: string, startId: number, names: string[]): Meal[] {
  return names.map((name, index) => ({
    idMeal: String(startId + index),
    strMeal: name,
    strMealThumb: `https://www.themealdb.com/images/media/meals/${prefix}-${index}.jpg`,
  }));
}

export const catalog: Record<string, Meal[]> = {
  Breakfast: meals("breakfast", 1000, [
    "Bread omelette",
    "Breakfast Potatoes",
    "Dutch poffertjes (mini pancakes)",
    "English Breakfast",
    "Oatmeal pancakes",
  ]),
  Dessert: meals("dessert", 2000, [
    "Æbleskiver",
    "Alfajores",
    "Apple Frangipan Tart",
    "Bakewell tart",
    "Banana Pancakes",
    "Battenberg Cake",
    "Chocolate Gateau",
    "Eton Mess",
    "Key Lime Pie",
    "Lemon Drizzle Cake",
    "Pancakes",
    "Treacle Tart",
  ]),
  Vegetarian: meals("vegetarian", 3000, [
    "Air fryer patatas bravas",
    "Baingan Bharta",
    "Mushroom & Chestnut Rotolo",
    "Spicy North African Potato Salad",
    "Vegetable Shepherd's Pie",
    "Arra të Mbushura me Fik Walnut Stuffed Figs with Fig Syrup and a Very Long Recipe Name",
  ]),
  Seafood: meals("seafood", 4000, [
    "Fish pie",
    "Salt cod tortilla",
    "Garlicky prawns with sherry",
    "Kedgeree",
    "Paella",
    "Seafood fideuà",
    "Sushi",
    "Thai prawn curry",
  ]),
  Chicken: meals("chicken", 5000, [
    "Chicken Congee",
    "Chicken Handi",
    "Jerk chicken with rice & peas",
    "Kung Pao Chicken",
    "Tandoori chicken",
    "Teriyaki Chicken Casserole",
    "Thai green chicken soup",
    "Vietnamese chicken salad",
    "Brown Stew Chicken",
  ]),
};

export const total = Object.values(catalog).reduce((count, list) => count + list.length, 0);

function findMeal(id: string): { meal: Meal; category: string } | null {
  for (const [category, list] of Object.entries(catalog)) {
    const meal = list.find((item) => item.idMeal === id);
    if (meal) return { meal, category };
  }
  return null;
}

function detail(id: string) {
  const found = findMeal(id);
  if (!found) return { meals: null };
  return {
    meals: [
      {
        ...found.meal,
        strCategory: found.category,
        strArea: "British",
        strInstructions: `Prepare ${found.meal.strMeal}.\r\nServe warm.`,
        strIngredient1: "Flour",
        strMeasure1: "200g",
        strIngredient2: "Milk",
        strMeasure2: "300ml",
        strIngredient3: "",
        strMeasure3: "",
        strSource: "https://example.com/recipe",
        strYoutube: "",
      },
    ],
  };
}

export type MealDbOptions = {
  /** Categories whose filter request fails the first time it is made. */
  failOnce?: string[];
  /** Make the category list request fail every time. */
  failCategories?: boolean;
  /** Recipe ids whose thumbnail fails to load. */
  brokenImages?: string[];
};

export async function mockMealDb(page: Page, options: MealDbOptions = {}): Promise<void> {
  const failed = new Set<string>();
  const brokenImages = new Set(options.brokenImages ?? []);

  await page.route("https://www.themealdb.com/api/json/v1/1/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split("/").pop();
    if (name === "categories.php") {
      if (options.failCategories) return route.fulfill({ status: 500, body: "error" });
      return route.fulfill({
        json: { categories: Object.keys(catalog).map((strCategory, index) => ({ idCategory: String(index + 1), strCategory })) },
      });
    }
    if (name === "filter.php") {
      const category = url.searchParams.get("c") ?? "";
      if (options.failOnce?.includes(category) && !failed.has(category)) {
        failed.add(category);
        return route.fulfill({ status: 500, body: "error" });
      }
      return route.fulfill({ json: { meals: catalog[category] ?? null } });
    }
    if (name === "lookup.php") {
      return route.fulfill({ json: detail(url.searchParams.get("i") ?? "") });
    }
    return route.fulfill({ status: 404, body: "not found" });
  });

  await page.route("https://www.themealdb.com/images/**", async (route: Route) => {
    const url = route.request().url();
    const broken = [...brokenImages].some((id) => {
      const found = findMeal(id);
      return found !== null && url.startsWith(found.meal.strMealThumb);
    });
    if (broken) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ contentType: "image/png", body: pixel });
  });

  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "" }));
}
