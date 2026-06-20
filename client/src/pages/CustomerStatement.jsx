import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function CustomerStatement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/customers/${id}`),
      api.get(`/bookings?customer_id=${id}&limit=100`),
      api.get(`/payments?customer_id=${id}&limit=100`),
    ]).then(([c, b, p]) => {
      setCustomer(c.data);
      setDeals(b.data.rows || []);
      setPayments(p.data.rows || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const totalSelling = deals.reduce((s, d) => s + (d.total_amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balance = totalSelling - totalPaid;

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Statement: {customer?.full_name}</h5>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/customers')}>Back</button>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="card bg-success bg-opacity-10"><div className="card-body text-center"><small>Total Bookings</small><h4>{deals.length}</h4></div></div></div>
        <div className="col-md-4"><div className="card bg-primary bg-opacity-10"><div className="card-body text-center"><small>Total Selling</small><h4>${totalSelling.toLocaleString()}</h4></div></div></div>
        <div className="col-md-4"><div className={`card bg-opacity-10 ${balance > 0 ? 'bg-danger' : 'bg-success'}`}><div className="card-body text-center"><small>{balance > 0 ? 'Owes' : 'Credit'}</small><h4 className={balance > 0 ? 'text-danger' : 'text-success'}>${Math.abs(balance).toLocaleString()}</h4></div></div></div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h6>Bookings ({deals.length})</h6>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead><tr><th>Booking #</th><th>Date</th><th>Status</th><th>Amount</th><th>Paid</th><th>Balance</th></tr></thead>
              <tbody>
                {deals.map(d => (
                  <tr key={d.id}>
                    <td><Link to={`/bookings/${d.id}`} className="fw-semibold">{d.booking_number}</Link></td>
                    <td>{d.travel_date || '-'}</td>
                    <td><span className={`badge bg-${d.status === 'confirmed' ? 'success' : d.status === 'cancelled' ? 'danger' : 'warning'}`}>{d.status}</span></td>
                    <td>${(d.total_amount || 0).toLocaleString()}</td>
                    <td className="text-success">${(d.paid_amount || 0).toLocaleString()}</td>
                    <td className={`fw-bold ${(d.total_amount || 0) - (d.paid_amount || 0) > 0 ? 'text-danger' : 'text-success'}`}>${((d.total_amount || 0) - (d.paid_amount || 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6>Payments ({payments.length}) — Total: ${totalPaid.toLocaleString()}</h6>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead><tr><th>Payment #</th><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{p.payment_number}</td>
                    <td>{p.created_at?.split('T')[0]}</td>
                    <td>{p.payment_method}</td>
                    <td className="text-success fw-bold">${(p.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
