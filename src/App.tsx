import { Navigate, Routes, Route } from 'react-router-dom';
import { HomePage } from './routes/HomePage';
import { SoloPlayPage } from './routes/SoloPlayPage';
import { ChallengeModePage } from './routes/ChallengeModePage';
import { CalibrationPage } from './routes/CalibrationPage';
import { GestureTestPage } from './routes/GestureTestPage';
import { GamePage } from './routes/GamePage';
import { ResultPage } from './routes/ResultPage';
import { TeacherDashboardPage } from './routes/TeacherDashboardPage';
import { LessonEditorPage } from './routes/LessonEditorPage';
import { ResultsHistoryPage } from './routes/ResultsHistoryPage';
import { SettingsPage } from './routes/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/solo" element={<SoloPlayPage />} />
      <Route path="/challenge" element={<ChallengeModePage />} />
      <Route path="/challenge/host" element={<TeacherDashboardPage />} />
      <Route path="/challenge/host/lesson/:lessonId" element={<LessonEditorPage />} />
      <Route path="/challenge/host/lesson/new" element={<LessonEditorPage />} />
      {/* Legacy routes */}
      <Route path="/play" element={<Navigate to="/solo" replace />} />
      <Route path="/teacher" element={<Navigate to="/challenge/host" replace />} />
      <Route path="/teacher/lesson/:lessonId" element={<LessonEditorPage />} />
      <Route path="/teacher/lesson/new" element={<LessonEditorPage />} />
      {/* Play flow */}
      <Route path="/play/:lessonId/calibrate" element={<CalibrationPage />} />
      <Route path="/play/:lessonId/gesture-test" element={<GestureTestPage />} />
      <Route path="/play/:lessonId/game" element={<GamePage />} />
      <Route path="/play/:lessonId/result/:sessionId" element={<ResultPage />} />
      <Route path="/results" element={<ResultsHistoryPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
