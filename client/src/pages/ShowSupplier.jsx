import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function ShowSupplier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);

  const load = () => api.get(`/suppliers/${id}`).then(res => setSupplier(res.data));

  useEffect(() => { load(); }, [id]);

  const handleDelete = () => {
    Swal.fire({ title: 'تأكيد الحذف', text: 'سيتم حذف المورد', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء' }).then(r => {
      if (r.isConfirmed) api.delete(`/suppliers/${id}`).then(() => navigate('/suppliers'));
    });
  };

  if (!supplier) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">المورد: {supplier.name}</h5>
        <div>
          <Link to={`/suppliers/${id}/edit`} className="btn btn-warning me-2"><i className="bi bi-pencil"></i> تعديل</Link>
          <button className="btn btn-danger me-2" onClick={handleDelete}><i className="bi bi-trash"></i> حذف</button>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/suppliers')}>رجوع</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>معلومات المورد</h6>
              <div className="row g-2">
                <div className="col-6"><small className="text-secondary">الاسم</small><p className="mb-0">{supplier.name}</p></div>
                <div className="col-6"><small className="text-secondary">النوع</small><p className="mb-0">{supplier.type || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">الهاتف</small><p className="mb-0">{supplier.phone || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">البريد</small><p className="mb-0">{supplier.email || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">جهة الاتصال</small><p className="mb-0">{supplier.contact_person || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">العنوان</small><p className="mb-0">{supplier.address || '-'}</p></div>
              </div>
              {supplier.notes && <div className="mt-2"><small className="text-secondary">ملاحظات</small><p className="mb-0">{supplier.notes}</p></div>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card bg-info bg-opacity-10">
            <div className="card-body text-center">
              <h6>ملخص</h6>
              <div className="row g-3 mt-2">
                <div className="col-6">
                  <small className="text-secondary">الخدمات المرتبطة</small>
                  <h4 className="text-info mb-0">{supplier.services?.length || 0}</h4>
                </div>
                <div className="col-6">
                  <small className="text-secondary">الحجوزات</small>
                  <h4 className="text-primary mb-0">{supplier.bookings_count || 0}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6>الخدمات المرتبطة ({supplier.services?.length || 0})</h6>
          {supplier.services?.length === 0 && <p className="text-secondary mb-0">لا توجد خدمات مرتبطة بهذا المورد</p>}
          {supplier.services?.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr><th>الوصف</th><th>الحجز</th><th>التكلفة</th><th>السعر</th></tr></thead>
                <tbody>
                  {supplier.services.map((s, i) => (
                    <tr key={i}>
                      <td>{s.description}</td>
                      <td>{s.booking_number ? <Link to={`/bookings/${s.booking_id}`}>#{s.booking_number}</Link> : '-'}</td>
                      <td>{s.cost?.toLocaleString() || '-'}</td>
                      <td>{s.price?.toLocaleString() || '-'}</td>
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
