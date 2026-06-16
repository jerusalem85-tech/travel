import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ShowCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    api.get(`/customers/${id}`).then(res => setCustomer(res.data));
  }, [id]);

  if (!customer) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">{customer.full_name}</h5>
        <div>
          <Link to={`/customers/${id}/edit`} className="btn btn-warning me-2"><i className="bi bi-pencil"></i> تعديل</Link>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/customers')}>رجوع</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>معلومات العميل</h6>
              <div className="row g-2">
                <div className="col-6"><small className="text-secondary">الهاتف</small><p className="mb-0">{customer.phone || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">البريد</small><p className="mb-0">{customer.email || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">رقم الهوية</small><p className="mb-0">{customer.id_number || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">رقم الجواز</small><p className="mb-0">{customer.passport_number || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">الجنسية</small><p className="mb-0">{customer.nationality || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">إجمالي المدفوعات</small><p className="mb-0 text-success">{customer.totalPaid?.toLocaleString()}</p></div>
              </div>
              {customer.notes && <div className="mt-2"><small className="text-secondary">ملاحظات</small><p className="mb-0">{customer.notes}</p></div>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>الحجوزات ({customer.bookings?.length || 0})</h6>
              {customer.bookings?.length === 0 && <p className="text-secondary mb-0">لا يوجد حجوزات</p>}
              {customer.bookings?.map(b => (
                <div key={b.id} className="border-bottom py-2">
                  <Link to={`/bookings/${b.id}`} className="text-decoration-none">
                    <strong>#{b.booking_number}</strong>
                  </Link>
                  <span className="me-2">{b.from_destination} → {b.to_destination}</span>
                  <span className={`badge bg-${b.status === 'confirmed' ? 'success' : 'warning'} me-2`}>{b.status}</span>
                  <small className="text-secondary">{b.travel_date}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
