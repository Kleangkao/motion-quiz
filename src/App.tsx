import { Navigate, Routes, Route } from 'react-router-dom';
import { HomePage } from './routes/HomePage';
import { SoloPlayPage } from './routes/SoloPlayPage';
import { CalibrationPage } from './routes/CalibrationPage';
import { GestureTestPage } from './routes/GestureTestPage';
import { GamePage } from './routes/GamePage';
import { ResultPage } from './routes/ResultPage';
import { LessonEditorPage } from './routes/LessonEditorPage';
import { CreateTopicPage } from './routes/CreateTopicPage';
import { ResultsHistoryPage } from './routes/ResultsHistoryPage';
import { SettingsPage } from './routes/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/play" element={<SoloPlayPage />} />
      <Route path="/play/create-topic" element={<CreateTopicPage />} />
      <Route path="/play/edit-topic/:lessonId" element={<CreateTopicPage />} />
      <Route path="/solo" element={<Navigate to="/play" replace />} />
      <Route path="/challenge" element={<Navigate to="/play" replace />} />
      <Route path="/challenge/host" element={<Navigate to="/play/create-topic" replace />} />
      <Route path="/challenge/host/lesson/new" element={<Navigate to="/play/create-topic" replace />} />
      <Route path="/challenge/host/lesson/:lessonId" element={<LessonEditorPage />} />
      <Route path="/teacher" element={<Navigate to="/play/create-topic" replace />} />
      <Route path="/teacher/lesson/:lessonId" element={<LessonEditorPage />} />
      <Route path="/teacher/lesson/new" element={<Navigate to="/play/create-topic" replace />} />
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
