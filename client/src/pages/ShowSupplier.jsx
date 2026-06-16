import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ShowSupplier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);

  useEffect(() => { api.get(`/suppliers/${id}`).then(res => setSupplier(res.data)); }, [id]);

  if (!supplier) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">{supplier.name}</h5>
        <div>
          <Link to={`/suppliers/${id}/edit`} className="btn btn-warning me-2"><i className="bi bi-pencil"></i> تعديل</Link>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/suppliers')}>رجوع</button>
        </div>
      </div>
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>معلومات المورد</h6>
              <div className="row g-2">
                <div className="col-6"><small className="text-secondary">جهة الاتصال</small><p className="mb-0">{supplier.contact_person || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">الهاتف</small><p className="mb-0">{supplier.phone || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">البريد</small><p className="mb-0">{supplier.email || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">نوع الخدمة</small><p className="mb-0">{supplier.service_type || '-'}</p></div>
              </div>
              {supplier.notes && <div className="mt-2"><small className="text-secondary">ملاحظات</small><p className="mb-0">{supplier.notes}</p></div>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>الخدمات المربوطة ({supplier.services?.length || 0})</h6>
              {supplier.services?.length === 0 && <p className="text-secondary mb-0">لا يوجد خدمات</p>}
              {supplier.services?.map(s => (
                <div key={s.id} className="border-bottom py-2 d-flex justify-content-between">
                  <div><strong>{s.service_type}</strong><br /><small>{s.description}</small></div>
                  <div><span className="text-primary">{s.amount?.toLocaleString()}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
