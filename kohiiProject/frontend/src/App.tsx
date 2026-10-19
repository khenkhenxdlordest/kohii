import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { RealtimeProvider } from './context/RealtimeProvider';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <AppRoutes />
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
