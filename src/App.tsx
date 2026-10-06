import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { CatalogStatus } from "./components/CatalogStatus.tsx";
import { MealsProvider } from "./context/MealsProvider.tsx";
import { DetailPage } from "./pages/DetailPage.tsx";
import { GalleryPage } from "./pages/GalleryPage.tsx";
import { ListPage } from "./pages/ListPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import styles from "./App.module.css";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <MealsProvider>
        <div className={styles.page}>
          <header className={styles.header}>
            <Link to="/list" className={styles.brand}>
              Everyday Table
            </Link>
            <Link to="/list" className={styles.headerLink}>
              Browse recipes
            </Link>
          </header>
          <main className={styles.main} id="content">
            <CatalogStatus />
            <Routes>
              <Route path="/" element={<Navigate to="/list" replace />} />
              <Route path="/list" element={<ListPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/meal/:id" element={<DetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <footer className={styles.footer}>Recipes and photos from TheMealDB.</footer>
        </div>
      </MealsProvider>
    </BrowserRouter>
  );
}
