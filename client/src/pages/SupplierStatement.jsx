import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function SupplierStatement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/suppliers/${id}`),
      api.get(`/supplier-payments?supplier_id=${id}&limit=100`),
    ]).then(([s, p]) => {
      setSupplier(s.data);
      setPayments(p.data.rows || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const totalCost = (supplier?.services?.[0]?.total_cost || 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balance = totalCost - totalPaid;

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Statement: {supplier?.name || supplier?.supplier_name}</h5>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/suppliers')}>Back</button>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="card bg-primary bg-opacity-10"><div className="card-body text-center"><small>Total Cost</small><h4>${totalCost.toLocaleString()}</h4></div></div></div>
        <div className="col-md-4"><div className="card bg-success bg-opacity-10"><div className="card-body text-center"><small>Total Paid</small><h4>${totalPaid.toLocaleString()}</h4></div></div></div>
        <div className="col-md-4"><div className={`card bg-opacity-10 ${balance > 0 ? 'bg-danger' : 'bg-success'}`}><div className="card-body text-center"><small>{balance > 0 ? 'Outstanding' : 'Overpaid'}</small><h4 className={balance > 0 ? 'text-danger' : 'text-success'}>${Math.abs(balance).toLocaleString()}</h4></div></div></div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6>Supplier Payments ({payments.length}) — Total: ${totalPaid.toLocaleString()}</h6>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead><tr><th>Payment #</th><th>Date</th><th>Amount</th><th>Currency</th><th>Notes</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="fw-semibold">{p.payment_number}</td>
                    <td>{p.payment_date || p.created_at?.split('T')[0]}</td>
                    <td className="text-danger fw-bold">${(p.amount || 0).toLocaleString()}</td>
                    <td>{p.currency || 'USD'}</td>
                    <td className="text-muted small">{p.notes || '-'}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No payments recorded</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
