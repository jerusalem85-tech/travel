import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data));
    api.get('/stats/monthly-bookings').then(r => setMonthly(r.data || []));
  }, []);

  const totalRevenue = stats?.monthPayments || 0;
  const totalExpenses = stats?.monthExpenses || 0;
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div>
      <h5 className="page-title mb-4">Reports</h5>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card bg-primary bg-opacity-10 text-center"><div className="card-body py-3"><small className="text-muted">Total Bookings</small><h3 className="mb-0">{stats?.bookingsCount || 0}</h3></div></div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card bg-success bg-opacity-10 text-center"><div className="card-body py-3"><small className="text-muted">Total Customers</small><h3 className="mb-0">{stats?.customersCount || 0}</h3></div></div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card bg-info bg-opacity-10 text-center"><div className="card-body py-3"><small className="text-muted">Revenue (Month)</small><h3 className="mb-0">{(totalRevenue || 0).toLocaleString()} ILS</h3></div></div>
        </div>
        <div className="col-6 col-md-3">
          <div className={`card bg-opacity-10 text-center ${profit >= 0 ? 'bg-success' : 'bg-danger'}`}><div className="card-body py-3"><small className="text-muted">Profit (Month)</small><h3 className={`mb-0 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{(profit || 0).toLocaleString()} ILS</h3><small className={profit >= 0 ? 'text-success' : 'text-danger'}>{margin}% margin</small></div></div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Financial Summary</h6>
              <table className="table table-sm">
                <tbody>
                  <tr><td>Revenue</td><td className="text-end text-primary fw-bold">{(totalRevenue || 0).toLocaleString()} ILS</td></tr>
                  <tr><td>Expenses</td><td className="text-end text-danger fw-bold">{(totalExpenses || 0).toLocaleString()} ILS</td></tr>
                  <tr className="border-top"><td><strong>Net Profit</strong></td><td className={`text-end fw-bold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{(profit || 0).toLocaleString()} ILS</td></tr>
                  <tr><td>Customer Receivables</td><td className="text-end text-warning fw-bold">{(stats?.customerBalance || 0).toLocaleString()} ILS</td></tr>
                  <tr><td>Supplier Payables</td><td className="text-end text-info fw-bold">{(stats?.supplierBalance || 0).toLocaleString()} ILS</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Monthly Breakdown</h6>
              <div className="table-responsive" style={{ maxHeight: 300 }}>
                <table className="table table-sm table-hover">
                  <thead><tr><th>Month</th><th className="text-end">Bookings</th><th className="text-end">Revenue</th></tr></thead>
                  <tbody>
                    {monthly.map(m => (
                      <tr key={m.month}>
                        <td>{m.month}</td>
                        <td className="text-end">{m.count}</td>
                        <td className="text-end fw-semibold">{(m.revenue || 0).toLocaleString()} ILS</td>
                      </tr>
                    ))}
                    {monthly.length === 0 && <tr><td colSpan="3" className="text-center text-muted py-3">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          <div className="card text-center"><div className="card-body py-3"><small className="text-muted">Pending</small><h4 className="text-warning mb-0">{stats?.pendingBookings || 0}</h4></div></div>
        </div>
        <div className="col-md-4">
          <div className="card text-center"><div className="card-body py-3"><small className="text-muted">Suppliers</small><h4 className="text-info mb-0">{stats?.suppliersCount || 0}</h4></div></div>
        </div>
        <div className="col-md-4">
          <div className="card text-center"><div className="card-body py-3"><small className="text-muted">Today's Bookings</small><h4 className="text-primary mb-0">{stats?.todayBookings || 0}</h4></div></div>
        </div>
      </div>
    </div>
  );
}
