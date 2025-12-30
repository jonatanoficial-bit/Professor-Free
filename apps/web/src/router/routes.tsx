import React from "react";
import { RouteObject } from "react-router-dom";
import Onboarding from "../pages/Onboarding";
import Home from "../pages/Home";
import Schools from "../pages/Schools";
import Classes from "../pages/Classes";
import Students from "../pages/Students";
import QuickLesson from "../pages/QuickLesson";
import Insights from "../pages/Insights";
import Settings from "../pages/Settings";

export const routes: RouteObject[] = [
  { path: "/onboarding", element: <Onboarding /> },
  { path: "/", element: <Home /> },
  { path: "/schools", element: <Schools /> },
  { path: "/classes", element: <Classes /> },
  { path: "/students", element: <Students /> },
  { path: "/quick", element: <QuickLesson /> },
  { path: "/insights", element: <Insights /> },
  { path: "/settings", element: <Settings /> }
];