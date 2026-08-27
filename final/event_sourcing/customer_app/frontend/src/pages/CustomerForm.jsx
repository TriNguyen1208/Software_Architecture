import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function CustomerForm() {
  const [formData, setFormData] = useState({
    customer_id: '',
    fullname: '',
    lastname: '',
    date_of_birth: '',
    balance: ''
  });
  
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    try {
      await axios.post(`${API_URL}/customers`, {
        ...formData,
        balance: parseFloat(formData.balance)
      });
      
      setStatus({ type: 'success', message: 'Customer added successfully!' });
      setFormData({
        customer_id: '',
        fullname: '',
        lastname: '',
        date_of_birth: '',
        balance: ''
      });
    } catch (error) {
      console.error(error);
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.error || 'An error occurred while adding the customer.' 
      });
    }
  };

  return (
    <div className="glass-card">
      <h1 className="page-title">New Customer</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="customer_id">ID Number / SSN</label>
          <input 
            type="text" 
            id="customer_id"
            name="customer_id" 
            value={formData.customer_id} 
            onChange={handleChange} 
            required 
            placeholder="e.g. 123456789"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="fullname">First Name (Fullname)</label>
          <input 
            type="text" 
            id="fullname"
            name="fullname" 
            value={formData.fullname} 
            onChange={handleChange} 
            required 
            placeholder="e.g. John"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastname">Last Name</label>
          <input 
            type="text" 
            id="lastname"
            name="lastname" 
            value={formData.lastname} 
            onChange={handleChange} 
            required 
            placeholder="e.g. Doe"
          />
        </div>

        <div className="form-group">
          <label htmlFor="date_of_birth">Date of Birth</label>
          <input 
            type="date" 
            id="date_of_birth"
            name="date_of_birth" 
            value={formData.date_of_birth} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="balance">Starting Balance ($)</label>
          <input 
            type="number" 
            step="0.01"
            id="balance"
            name="balance" 
            value={formData.balance} 
            onChange={handleChange} 
            required 
            placeholder="0.00"
          />
        </div>

        <button type="submit" className="btn-primary">Add Customer</button>
      </form>
      
      {status.message && (
        <div className={`message ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default CustomerForm;
