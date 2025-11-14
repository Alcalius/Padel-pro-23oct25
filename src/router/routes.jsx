// src/router/routes.jsx
import React from "react";
import { createBrowserRouter } from "react-router-dom";

import RootLayout from "../layout/RootLayout";

// Páginas
import Home from "../pages/Home";
import Login from "../pages/Login";
import Profile from "../pages/Profile";
import Clubes from "../pages/Clubes";
import Torneos from "../pages/Torneos";
import TorneoDetalle from "../pages/TorneoDetalle";
import TorneoJugar from "../pages/TorneoJugar";
import RankingInfo from "../pages/RankingInfo";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "perfil", element: <Profile /> },
      { path: "clubes", element: <Clubes /> },
      { path: "torneos", element: <Torneos /> },
      { path: "torneos/:id", element: <TorneoDetalle /> },
      { path: "torneos/:id/jugar", element: <TorneoJugar /> },

      // 👉 Coincide con navigate("/rankinginfo")
      { path: "rankinginfo", element: <RankingInfo /> },

      // Opcional: alias extra /ranking-info si algún día lo usas
      { path: "ranking-info", element: <RankingInfo /> },
    ],
  },
]);

export default router;
