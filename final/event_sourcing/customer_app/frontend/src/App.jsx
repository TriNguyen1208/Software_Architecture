import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomerList from './pages/CustomerList';
import CustomerForm from './pages/CustomerForm';
import GlobalHistory from './pages/GlobalHistory';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">EventSourcingDB</div>
          <div className="nav-links">
            <Link to="/" className="nav-link">Customers</Link>
            <Link to="/add" className="nav-link">Add Customer</Link>
            <Link to="/history" className="nav-link">Global History</Link>
          </div>
        </nav>
        <div className="container">
          <Routes>
            <Route path="/" element={<CustomerList />} />
            <Route path="/add" element={<CustomerForm />} />
            <Route path="/history" element={<GlobalHistory />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
