import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Expenses() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1, sum: 0, categories: [] });
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0] });

  const load = () => {
    const params = { page, limit: 20 };
    if (category) params.category = category;
    if (from) params.from = from;
    if (to) params.to = to;
    api.get('/expenses', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page, category, from, to]);

  const handleSubmit = async () => {
    if (!form.description || !form.amount) return;
    await api.post('/expenses', { ...form, amount: parseFloat(form.amount) });
    setShowModal(false);
    setForm({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0] });
    load();
  };

  const handleDelete = (id) => {
    Swal.fire({ title: 'تأكيد الحذف', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء' }).then(r => {
      if (r.isConfirmed) api.delete(`/expenses/${id}`).then(() => load());
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">المصاريف</h5>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><i className="bi bi-plus-lg"></i> مصروف جديد</button>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col"><select className="form-select" value={category} onChange={e => setCategory(e.target.value)}><option value="">كل التصنيفات</option>{data.categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="col"><input type="date" className="form-control" value={from} onChange={e => setFrom(e.target.value)} placeholder="من" /></div>
            <div className="col"><input type="date" className="form-control" value={to} onChange={e => setTo(e.target.value)} placeholder="إلى" /></div>
            <div className="col-auto d-flex align-items-center"><strong className="text-danger">{data.sum?.toLocaleString()}</strong><small className="me-1 text-secondary">الإجمالي</small></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>الوصف</th><th>التصنيف</th><th>المبلغ</th><th>التاريخ</th><th></th></tr></thead>
            <tbody>
              {data.rows.map(e => (
                <tr key={e.id}>
                  <td>{e.description}</td>
                  <td>{e.category || '-'}</td>
                  <td className="text-danger">{e.amount?.toLocaleString()}</td>
                  <td>{e.date || e.created_at?.substring(0, 10)}</td>
                  <td><button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(e.id)}><i className="bi bi-trash"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h6 className="modal-title">مصروف جديد</h6><button className="btn-close" onClick={() => setShowModal(false)}></button></div>
              <div className="modal-body">
                <div className="mb-2"><label className="form-label">الوصف <span className="text-danger">*</span></label><input className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <div className="mb-2"><label className="form-label">المبلغ <span className="text-danger">*</span></label><input type="number" className="form-control" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
                <div className="mb-2"><label className="form-label">التصنيف</label><input className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></div>
                <div className="mb-2"><label className="form-label">التاريخ</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button className="btn btn-primary" onClick={handleSubmit}>إضافة</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
