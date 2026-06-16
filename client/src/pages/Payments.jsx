import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Payments() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({ booking_id: '', invoice_id: '', amount: '', payment_method: 'نقداً', reference: '', notes: '' });

  const load = () => api.get('/payments', { params: { page, limit: 20 } }).then(res => setData(res.data));
  useEffect(() => { load(); }, [page]);

  const openModal = async () => {
    const [b, i] = await Promise.all([
      api.get('/bookings', { params: { limit: 1000 } }),
      api.get('/invoices', { params: { limit: 1000 } }),
    ]);
    setBookings(b.data.rows);
    setInvoices(i.data.rows);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.amount || form.amount <= 0) return;
    await api.post('/payments', { ...form, amount: parseFloat(form.amount) });
    setShowModal(false);
    setForm({ booking_id: '', invoice_id: '', amount: '', payment_method: 'نقداً', reference: '', notes: '' });
    load();
  };

  const handleDelete = (id) => {
    Swal.fire({ title: 'تأكيد الحذف', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء' }).then(r => {
      if (r.isConfirmed) api.delete(`/payments/${id}`).then(() => load());
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">المدفوعات</h5>
        <button className="btn btn-primary" onClick={openModal}><i className="bi bi-plus-lg"></i> دفعة جديدة</button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>رقم الدفعة</th><th>العميل</th><th>الحجز</th><th>المبلغ</th><th>طريقة الدفع</th><th>مرجع</th><th>التاريخ</th><th></th></tr></thead>
            <tbody>
              {data.rows.map(p => (
                <tr key={p.id}>
                  <td>{p.payment_number}</td>
                  <td>{p.customer_name || '-'}</td>
                  <td>{p.booking_number ? <Link to={`/bookings/${p.booking_id}`}>#{p.booking_number}</Link> : '-'}</td>
                  <td className="text-success">{p.amount?.toLocaleString()}</td>
                  <td>{p.payment_method || '-'}</td>
                  <td>{p.reference || '-'}</td>
                  <td>{p.created_at?.substring(0, 10)}</td>
                  <td><button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)}><i className="bi bi-trash"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h6 className="modal-title">تسجيل دفعة جديدة</h6><button className="btn-close" onClick={() => setShowModal(false)}></button></div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">الحجز (اختياري)</label>
                  <select className="form-select" value={form.booking_id} onChange={e => setForm({...form, booking_id: e.target.value})}>
                    <option value="">بدون حجز</option>
                    {bookings.map(b => <option key={b.id} value={b.id}>#{b.booking_number}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">الفاتورة (اختياري)</label>
                  <select className="form-select" value={form.invoice_id} onChange={e => setForm({...form, invoice_id: e.target.value})}>
                    <option value="">بدون فاتورة</option>
                    {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}
                  </select>
                </div>
                <div className="mb-2"><label className="form-label">المبلغ <span className="text-danger">*</span></label><input type="number" className="form-control" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
                <div className="mb-2"><label className="form-label">طريقة الدفع</label>
                  <select className="form-select" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                    <option>نقداً</option><option>تحويل بنكي</option><option>شبكة</option><option>بطاقة ائتمان</option>
                  </select>
                </div>
                <div className="mb-2"><label className="form-label">رقم المرجع</label><input className="form-control" value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} /></div>
                <div className="mb-2"><label className="form-label">ملاحظات</label><input className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button className="btn btn-primary" onClick={handleSubmit}>تسجيل</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {data.total > 20 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-center">
            {Array.from({ length: Math.ceil(data.total / 20) }, (_, i) => i + 1).map(p => (
              <li key={p} className={`page-item ${p === data.page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(p)}>{p}</button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
