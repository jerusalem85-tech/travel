import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function ShowCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);

  const load = () => api.get(`/customers/${id}`).then(res => setCustomer(res.data));

  useEffect(() => { load(); }, [id]);

  const handleDelete = () => {
    Swal.fire({ title: 'Confirm Deletion', text: 'The customer and all their bookings will be deleted', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'Cancel' }).then(r => {
      if (r.isConfirmed) api.delete(`/customers/${id}`).then(() => navigate('/customers'));
    });
  };

  const statusBadge = (status) => {
    const colors = { confirmed: 'success', pending: 'warning', cancelled: 'danger', completed: 'info' };
    const labels = { confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed' };
    return <span className={`badge bg-${colors[status] || 'secondary'}`}>{labels[status] || status}</span>;
  };

  if (!customer) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Customer: {customer.full_name}</h5>
        <div>
          <Link to={`/customers/${id}/edit`} className="btn btn-warning me-2"><i className="bi bi-pencil"></i> Edit</Link>
          <button className="btn btn-danger me-2" onClick={handleDelete}><i className="bi bi-trash"></i> Delete</button>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/customers')}>Back</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>Customer Information</h6>
              <div className="row g-2">
                <div className="col-6"><small className="text-secondary">Name</small><p className="mb-0">{customer.full_name}</p></div>
                <div className="col-6"><small className="text-secondary">Phone</small><p className="mb-0">{customer.phone || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">Email</small><p className="mb-0">{customer.email || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">ID Number</small><p className="mb-0">{customer.id_number || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">Passport</small><p className="mb-0">{customer.passport_number || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">Nationality</small><p className="mb-0">{customer.nationality || '-'}</p></div>
                {customer.address && <div className="col-12"><small className="text-secondary">Address</small><p className="mb-0">{customer.address}</p></div>}
                {customer.notes && <div className="col-12"><small className="text-secondary">Notes</small><p className="mb-0">{customer.notes}</p></div>}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card bg-success bg-opacity-10">
            <div className="card-body text-center">
              <h6>Financial Summary</h6>
              <div className="row g-3 mt-2">
                <div className="col-6">
                  <small className="text-secondary">Total Paid</small>
                  <h4 className="text-success mb-0">{(customer.totalPaid || 0).toLocaleString()}</h4>
                </div>
                <div className="col-6">
                  <small className="text-secondary">Bookings Count</small>
                  <h4 className="text-primary mb-0">{customer.bookings?.length || 0}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Customer Bookings ({customer.bookings?.length || 0})</h6>
            <Link to="/bookings/create" className="btn btn-sm btn-outline-primary"><i className="bi bi-plus"></i> New Booking</Link>
          </div>
          {customer.bookings?.length === 0 && <p className="text-secondary mb-0">No bookings for this customer</p>}
          {customer.bookings?.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr><th>Booking #</th><th>Destination</th><th>Date</th><th>Amount</th><th>Paid</th><th>Status</th></tr></thead>
                <tbody>
                  {customer.bookings.map(b => (
                    <tr key={b.id}>
                      <td><Link to={`/bookings/${b.id}`} className="text-decoration-none">{b.booking_number}</Link></td>
                      <td>{b.from_destination && b.to_destination ? `${b.from_destination} → ${b.to_destination}` : '-'}</td>
                      <td>{b.travel_date ? new Date(b.travel_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                      <td>{b.total_amount?.toLocaleString()}</td>
                      <td className="text-success">{b.paid_amount?.toLocaleString()}</td>
                      <td>{statusBadge(b.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
