import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(null);

  useEffect(() => {
    api.get('/customers', { params: { limit: 1000 } }).then(res => setCustomers(res.data.rows));
    api.get(`/bookings/${id}`).then(res => {
      const b = res.data;
      setForm({
        customer_id: b.customer_id, service_type: b.service_type || '', travel_date: b.travel_date || '',
        return_date: b.return_date || '', from_destination: b.from_destination || '', to_destination: b.to_destination || '',
        airline: b.airline || '', flight_number: b.flight_number || '', ticket_number: b.ticket_number || '',
        status: b.status, total_amount: b.total_amount, cost_amount: b.cost_amount, notes: b.notes || ''
      });
    });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.put(`/bookings/${id}`, form);
    navigate(`/bookings/${id}`);
  };

  if (!form) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <h5 className="page-title mb-3">تعديل الحجز #{id}</h5>
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">العميل</label>
                <select className="form-select" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} required>
                  <option value="">اختر عميل...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">نوع الخدمة</label>
                <input className="form-control" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">من</label>
                <input className="form-control" value={form.from_destination} onChange={e => setForm({...form, from_destination: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">إلى</label>
                <input className="form-control" value={form.to_destination} onChange={e => setForm({...form, to_destination: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">تاريخ السفر</label>
                <input type="date" className="form-control" value={form.travel_date} onChange={e => setForm({...form, travel_date: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">تاريخ العودة</label>
                <input type="date" className="form-control" value={form.return_date} onChange={e => setForm({...form, return_date: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">شركة الطيران</label>
                <input className="form-control" value={form.airline} onChange={e => setForm({...form, airline: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">رقم الرحلة</label>
                <input className="form-control" value={form.flight_number} onChange={e => setForm({...form, flight_number: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">رقم التذكرة</label>
                <input className="form-control" value={form.ticket_number} onChange={e => setForm({...form, ticket_number: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">الحالة</label>
                <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="pending">معلق</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="completed">منتهي</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">المبلغ الإجمالي</label>
                <input type="number" className="form-control" value={form.total_amount} onChange={e => setForm({...form, total_amount: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">التكلفة</label>
                <input type="number" className="form-control" value={form.cost_amount} onChange={e => setForm({...form, cost_amount: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="col-12">
                <label className="form-label">ملاحظات</label>
                <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea>
              </div>
            </div>
            <div className="mt-3">
              <button type="submit" className="btn btn-primary">حفظ التعديلات</button>
              <button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate(`/bookings/${id}`)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
