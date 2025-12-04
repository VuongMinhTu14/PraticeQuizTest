
import React, { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import MainLayout from "./routes/layouts/mainLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const Dashboard = React.lazy(() => import("./routes/dashboard/dashboard"));
const ProfilePage = React.lazy(() => import("./routes/profile/profilePage"));
const Practice = React.lazy(() => import("./routes/practice/practice"));
const PracticeDetail = React.lazy(() => import("./routes/practice/practiceDetail"));
const AttemptPage = React.lazy(() => import("./routes/attempt/attemptPage"));
const AttemptWritingPage = React.lazy(() => import("./routes/attempt/attemptWritingPage"));
const Game = React.lazy(() => import("./routes/game/game"));
const AuthPage = React.lazy(() => import("./routes/authPage/authPage"));
const PracticeWriting = React.lazy(() => import("./routes/practice/practiceWriting"));
const PracticeWritingDetail = React.lazy(() => import("./routes/practice/practiceWritingDetail"));
const ToeicResultPage = React.lazy(() => import("./routes/practice/ToeicResultPage"));
const ToeicReviewPage = React.lazy(() => import("./routes/practice/ToeicReviewPage"));
const ToeicWritingReviewPage = React.lazy(() => import("./routes/practice/ToeicWritingReviewPage"));
const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path='/' element={<Dashboard />} />
               <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path='/practice' element={<Practice />} />
              <Route path="/practice/:id" element={<PracticeDetail />} />
              <Route path='/practice/writing' element={<PracticeWriting />} />
              <Route path='/practice/writing/:id' element={<PracticeWritingDetail />} />
              <Route path="/attempt-writing/:attemptId" element={<AttemptWritingPage />}/>
              <Route path="/attempt-writing/:attemptId/review" element={<ToeicWritingReviewPage />}/>
              <Route path="/attempt/:attemptId/result" element={<ToeicResultPage />} />
              <Route path="/attempt/:attemptId/review" element={<ToeicReviewPage />} />
              <Route path="/attempt/:attemptId" element={<AttemptPage  />} />
              <Route path='/game' element={<Game />} />
            </Route>
            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
