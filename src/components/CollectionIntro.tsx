import { MealImage } from "./MealImage.tsx";
import styles from "./CollectionIntro.module.css";

type CollectionIntroProps = {
  recipeCount: number | null;
  imageUrl: string | null;
};

export function CollectionIntro({ recipeCount, imageUrl }: CollectionIntroProps) {
  const subject =
    recipeCount === null ? "recipes" : `${recipeCount} ${recipeCount === 1 ? "recipe" : "recipes"}`;
  return (
    <section className={styles.intro}>
      <div>
        <h1 className={styles.title}>Find your next meal</h1>
        <p className={styles.lede}>
          Search {subject} from TheMealDB by name, or start with a category like Breakfast.
        </p>
      </div>
      {imageUrl !== null && <MealImage src={imageUrl} alt="" loading="eager" className={styles.image} />}
    </section>
  );
}
