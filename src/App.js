import { BrowserRouter as Router } from 'react-router-dom';
import Routes from './routes/routes';

function App() {
  return (
    <Router basename="/SmartAC-Controller">
      <div className="min-h-screen bg-gray-50">
        <Routes />
      </div>
    </Router>
  );
}

export default App; 