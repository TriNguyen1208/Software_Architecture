import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit State
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    customer_id: '',
    fullname: '',
    lastname: '',
    date_of_birth: '',
    balance: ''
  });
  const [editStatus, setEditStatus] = useState({ type: '', message: '' });

  // History State
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`);
      setCustomers(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load customers.');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      customer_id: customer.customer_id,
      fullname: customer.fullname,
      lastname: customer.lastname,
      date_of_birth: customer.date_of_birth.split('T')[0],
      balance: customer.balance
    });
    setEditStatus({ type: '', message: '' });
  };

  const handleEditChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditStatus({ type: '', message: '' });

    try {
      await axios.put(`${API_URL}/customers/${editingCustomer.id}`, {
        ...editFormData,
        balance: parseFloat(editFormData.balance)
      });
      
      setEditStatus({ type: 'success', message: 'Customer updated successfully!' });
      fetchCustomers();
      
      setTimeout(() => {
        setEditingCustomer(null);
      }, 1500);
      
    } catch (err) {
      console.error(err);
      setEditStatus({ 
        type: 'error', 
        message: err.response?.data?.error || 'Failed to update customer.' 
      });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await axios.delete(`${API_URL}/customers/${id}`);
        fetchCustomers();
      } catch (err) {
        console.error(err);
        alert('Failed to delete customer');
      }
    }
  };

  const handleHistoryClick = async (customer) => {
    setHistoryCustomer(customer);
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API_URL}/customers/${customer.id}/events`);
      setHistoryEvents(response.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const renderEventPayload = (event) => {
    if (event.event_type === 'CustomerCreated') {
      return (
        <div className="event-details">
          <p><strong>Initial Data:</strong></p>
          <ul>
            <li>Name: {event.payload.fullname} {event.payload.lastname}</li>
            <li>Balance: {formatCurrency(event.payload.balance)}</li>
          </ul>
        </div>
      );
    }
    if (event.event_type === 'CustomerUpdated') {
      const changes = event.payload.changes;
      return (
        <div className="event-details">
          <p><strong>Changes:</strong></p>
          <ul>
            {Object.keys(changes).map(key => (
              <li key={key}>
                <span className="field-name">{key}:</span> 
                <span className="old-val">{key === 'balance' ? formatCurrency(changes[key].old) : changes[key].old}</span> 
                {' ➔ '} 
                <span className="new-val">{key === 'balance' ? formatCurrency(changes[key].new) : changes[key].new}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (event.event_type === 'CustomerDeleted') {
      return <p>Customer deleted.</p>;
    }
    return <pre>{JSON.stringify(event.payload, null, 2)}</pre>;
  };

  return (
    <div className="glass-card">
      <h1 className="page-title">Customer Database</h1>
      
      {loading ? (
        <p>Loading records...</p>
      ) : error ? (
        <div className="message error">{error}</div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <h3>No customers found</h3>
          <p>Go to the Add Customer page to create a new record.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Last Name</th>
                <th>Date of Birth</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.customer_id}</td>
                  <td>{customer.fullname}</td>
                  <td>{customer.lastname}</td>
                  <td>{formatDate(customer.date_of_birth).split(',')[0]}</td>
                  <td>{formatCurrency(customer.balance)}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-action btn-history" onClick={() => handleHistoryClick(customer)}>Logs</button>
                      <button className="btn-action btn-edit" onClick={() => handleEditClick(customer)}>Edit</button>
                      <button className="btn-action btn-delete" onClick={() => handleDelete(customer.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Customer</h2>
              <button className="btn-close" onClick={() => setEditingCustomer(null)}>&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>ID Number / SSN</label>
                <input type="text" name="customer_id" value={editFormData.customer_id} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>First Name (Fullname)</label>
                <input type="text" name="fullname" value={editFormData.fullname} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" name="lastname" value={editFormData.lastname} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" name="date_of_birth" value={editFormData.date_of_birth} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Balance ($)</label>
                <input type="number" step="0.01" name="balance" value={editFormData.balance} onChange={handleEditChange} required />
              </div>
              {editStatus.message && (
                <div className={`message ${editStatus.type}`}>
                  {editStatus.message}
                </div>
              )}
              <div className="btn-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditingCustomer(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ marginTop: 0 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyCustomer && (
        <div className="modal-overlay">
          <div className="modal-content history-modal">
            <div className="modal-header">
              <h2>Audit Log: {historyCustomer.fullname}</h2>
              <button className="btn-close" onClick={() => setHistoryCustomer(null)}>&times;</button>
            </div>
            
            <div className="timeline">
              {loadingHistory ? (
                <p>Loading history...</p>
              ) : historyEvents.length === 0 ? (
                <p>No events found.</p>
              ) : (
                historyEvents.map((ev) => (
                  <div key={ev.event_id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <span className="event-date">{formatDate(ev.created_at)}</span>
                      <h4 className="event-title">{ev.event_type}</h4>
                      {renderEventPayload(ev)}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="btn-actions">
              <button type="button" className="btn-secondary" onClick={() => setHistoryCustomer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerList;
