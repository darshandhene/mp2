import type { MealDetail, MealSummary } from "../types/meal.ts";

const breakfastNames = [
  "Bread omelette",
  "Breakfast Potatoes",
  "Dutch poffertjes (mini pancakes)",
  "English Breakfast",
  "Full English Breakfast",
  "Grits",
  "Oatmeal pancakes",
  "Salmon Eggs Eggs Benedict",
];

const dessertNames = [
  "Æbleskiver",
  "Alfajores",
  "Apple & Blackberry Crumble",
  "Apple Frangipan Tart",
  "Bakewell tart",
  "Banana Pancakes",
  "Battenberg Cake",
  "Chocolate Gateau",
  "Eton Mess",
  "Pancakes",
];

const vegetarianNames = [
  "Air fryer patatas bravas",
  "Baingan Bharta",
  "Pancakes",
  "Mushroom & Chestnut Rotolo",
  "Spicy North African Potato Salad",
  "Arra të Mbushura me Fik Walnut Stuffed Figs with Fig Syrup and a Very Long Recipe Name",
];

function build(category: string, names: string[], startId: number): MealSummary[] {
  return names.map((name, index) => ({
    id: String(startId + index),
    name,
    category,
    imageUrl: `https://www.themealdb.com/images/media/meals/fixture-${startId + index}.jpg`,
  }));
}

/**
 * 26 meals across Breakfast, Dessert, Vegetarian, and Seafood. Includes a duplicate name
 * ("Pancakes" in Dessert and Vegetarian), a long name, a missing image, and Unicode names.
 */
export const fixtureMeals: MealSummary[] = [
  ...build("Breakfast", breakfastNames, 1000),
  ...build("Dessert", dessertNames, 2000),
  ...build("Vegetarian", vegetarianNames, 3000),
  { id: "4000", name: "Salt cod tortilla", category: "Seafood", imageUrl: null },
  { id: "4001", name: "Fish pie", category: "Seafood", imageUrl: "https://www.themealdb.com/images/media/meals/fixture-4001.jpg" },
];

export const fixtureCategories = ["Breakfast", "Dessert", "Seafood", "Vegetarian"];

export const fixtureDetail: MealDetail = {
  id: "1001",
  name: "Breakfast Potatoes",
  category: "Breakfast",
  imageUrl: "https://www.themealdb.com/images/media/meals/1550441882.jpg",
  area: "Canadian",
  instructions: "Wash the potatoes and cut into medium dice.\nCook for 10 minutes until brown.",
  ingredients: [
    { name: "Potatoes", measure: "3 Medium" },
    { name: "Olive Oil", measure: "1 tbs" },
    { name: "Garlic Clove", measure: "" },
  ],
  sourceUrl: "https://example.com/breakfast-potatoes",
  youtubeUrl: null,
};
