import { expect, test } from "@playwright/test";
import { mockMealDb } from "./mealdb.ts";

test.beforeEach(async ({ page }) => {
  await mockMealDb(page);
});

test("a direct recipe URL boots the app through the Pages 404 fallback", async ({ page }) => {
  const response = await page.goto("/mp2/meal/1001");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Breakfast Potatoes" })).toBeVisible();
});

test("refreshing a filtered collection keeps its state", async ({ page }) => {
  await page.goto("/mp2/gallery?from=gallery&q=pan&category=Dessert");
  await expect(page.getByRole("button", { name: "Dessert", pressed: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Search recipes by name")).toHaveValue("pan");
  await expect(page.getByRole("button", { name: "Dessert", pressed: true })).toBeVisible();
});

test("the root redirects to the list and assets load from /mp2/", async ({ page }) => {
  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/mp2/assets/") && !response.ok()) failures.push(response.url());
  });
  await page.goto("/mp2/");
  await expect(page).toHaveURL(/\/mp2\/list$/);
  await expect(page.getByRole("heading", { level: 1, name: "Find your next meal" })).toBeVisible();
  expect(failures).toEqual([]);
});
