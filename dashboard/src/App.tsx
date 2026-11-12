import { Route, Routes } from 'react-router-dom'
import DashboardLayout from './layout/DashboardLayout'
import Overview from './pages/Overview'
import ContentPage from './pages/ContentPage'
import AudiencePage from './pages/AudiencePage'

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="audience" element={<AudiencePage />} />
      </Route>
    </Routes>
  )
}
