import { HashRouter } from 'react-router-dom'
import { InstitutionProvider } from './context/InstitutionContext.jsx'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <InstitutionProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </InstitutionProvider>
  )
}

export default App
