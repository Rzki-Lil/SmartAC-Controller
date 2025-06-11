import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/routes';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <AppRoutes />
      </div>
    </Router>
  );
}

export default App;