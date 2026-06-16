import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ booking_id: '', customer_id: '', total_amount: 0, notes: '' });

  useEffect(() => {
    api.get('/customers', { params: { limit: 1000 } }).then(res => setCustomers(res.data.rows));
    api.get('/bookings', { params: { limit: 1000 } }).then(res => setBookings(res.data.rows));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post('/invoices', form);
    navigate(`/invoices/${res.data.id}`);
  };

  return (
    <div>
      <h5 className="page-title mb-3">فاتورة جديدة</h5>
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">العميل <span className="text-danger">*</span></label>
                <select className="form-select" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} required>
                  <option value="">اختر عميل...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">الحجز (اختياري)</label>
                <select className="form-select" value={form.booking_id} onChange={e => setForm({...form, booking_id: e.target.value})}>
                  <option value="">بدون حجز</option>
                  {bookings.map(b => <option key={b.id} value={b.id}>#{b.booking_number} - {b.customer_name}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">المبلغ الإجمالي</label>
                <input type="number" className="form-control" value={form.total_amount} onChange={e => setForm({...form, total_amount: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="col-12">
                <label className="form-label">ملاحظات</label>
                <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea>
              </div>
            </div>
            <div className="mt-3">
              <button type="submit" className="btn btn-primary">إنشاء الفاتورة</button>
              <button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate('/invoices')}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
