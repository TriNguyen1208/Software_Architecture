import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function GlobalHistory() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}/events`);
      setEvents(response.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load global history.');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    } catch (e) {
      return `$${amount}`;
    }
  };

  const renderEventPayload = (event) => {
    if (!event || !event.payload) {
      return <p className="event-details">No detail payload available.</p>;
    }

    if (event.event_type === 'CustomerCreated') {
      return (
        <div className="event-details">
          <p><strong>Initial Data:</strong></p>
          <ul>
            <li>Name: {event.payload.fullname || ''} {event.payload.lastname || ''}</li>
            <li>Customer ID: {event.payload.customer_id || 'N/A'}</li>
            <li>Balance: {formatCurrency(event.payload.balance)}</li>
          </ul>
        </div>
      );
    }
    if (event.event_type === 'CustomerUpdated') {
      const changes = event.payload.changes || {};
      const keys = Object.keys(changes);
      if (keys.length === 0) {
        return <p className="event-details">No fields modified.</p>;
      }
      return (
        <div className="event-details">
          <p><strong>Changes:</strong></p>
          <ul>
            {keys.map(key => (
              <li key={key}>
                <span className="field-name">{key}:</span> 
                <span className="old-val">{key === 'balance' ? formatCurrency(changes[key]?.old) : String(changes[key]?.old ?? '')}</span> 
                {' ➔ '} 
                <span className="new-val">{key === 'balance' ? formatCurrency(changes[key]?.new) : String(changes[key]?.new ?? '')}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (event.event_type === 'CustomerDeleted') {
      return <p className="event-details">Customer permanently deleted from current view.</p>;
    }
    return <pre className="event-details">{JSON.stringify(event.payload, null, 2)}</pre>;
  };

  return (
    <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-title">Global Audit Log</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        A complete immutable history of every action performed in the system.
      </p>
      
      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading history...</p>
      ) : error ? (
        <div className="message error">{error}</div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <h3>No events found</h3>
          <p>The event store is currently empty.</p>
        </div>
      ) : (
        <div className="timeline">
          {events.map((ev) => (
            <div key={ev.event_id || Math.random()} className="timeline-item">
              <div className="timeline-dot" style={{ 
                background: ev.event_type === 'CustomerDeleted' ? '#ef4444' : ev.event_type === 'CustomerCreated' ? '#10b981' : '#f59e0b',
                borderColor: 'var(--surface-color)'
              }}></div>
              <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="event-date">{formatDate(ev.created_at)}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ID: {ev.aggregate_id ? String(ev.aggregate_id).substring(0, 8) + '...' : 'N/A'}
                  </span>
                </div>
                <h4 className="event-title">{ev.event_type}</h4>
                {renderEventPayload(ev)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GlobalHistory;
