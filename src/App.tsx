import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
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
            <div>
              <Link to="/list" className={styles.wordmark}>
                Supper
              </Link>
              <p className={styles.tagline}>Recipes for dinner</p>
            </div>
            <nav className={styles.nav} aria-label="Views">
              <NavLink to="/list">List</NavLink>
              <NavLink to="/gallery">Gallery</NavLink>
            </nav>
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
          <footer className={styles.footer}>Meals from the free TheMealDB catalog.</footer>
        </div>
      </MealsProvider>
    </BrowserRouter>
  );
}
