import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function Insurance() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '', booking_id: '', provider_name: '', policy_type: '',
    coverage_amount: '', premium_amount: '', currency: 'SAR',
    start_date: '', end_date: '', status: 'active', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    api.get('/insurance', { params }).then(res => setData(res.data));
  };

  const loadCustomers = () => {
    api.get('/insurance/customers').then(res => {
      setCustomers(res.data.rows || res.data || []);
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { loadCustomers(); }, []);

  const resetForm = () => {
    setFormData({
      customer_id: '', booking_id: '', provider_name: '', policy_type: '',
      coverage_amount: '', premium_amount: '', currency: 'SAR',
      start_date: '', end_date: '', status: 'active', notes: ''
    });
    setEditItem(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      customer_id: item.customer_id || '',
      booking_id: item.booking_id || '',
      provider_name: item.provider_name || '',
      policy_type: item.policy_type || '',
      coverage_amount: item.coverage_amount || '',
      premium_amount: item.premium_amount || '',
      currency: item.currency || 'SAR',
      start_date: item.start_date ? item.start_date.split('T')[0] : '',
      end_date: item.end_date ? item.end_date.split('T')[0] : '',
      status: item.status || 'active',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      Swal.fire('تنبيه', 'اختر العميل', 'warning'); return;
    }
    if (!formData.provider_name.trim()) {
      Swal.fire('تنبيه', 'أدخل اسم المزود', 'warning'); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        customer_id: Number(formData.customer_id),
        booking_id: formData.booking_id ? Number(formData.booking_id) : null,
        coverage_amount: formData.coverage_amount ? Number(formData.coverage_amount) : null,
        premium_amount: formData.premium_amount ? Number(formData.premium_amount) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };
      if (editItem) {
        await api.put(`/insurance/${editItem.id}`, payload);
        Swal.fire('تم التحديث', 'تم تحديث وثيقة التأمين', 'success');
      } else {
        await api.post('/insurance', payload);
        Swal.fire('تم الإضافة', 'تم إضافة وثيقة التأمين', 'success');
      }
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      Swal.fire('خطأ', err.response?.data?.message || 'فشل الحفظ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, policyNumber) => {
    Swal.fire({
      title: 'تأكيد الحذف', text: `سيتم حذف الوثيقة: ${policyNumber}`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء'
    }).then(r => {
      if (r.isConfirmed) api.delete(`/insurance/${id}`).then(() => load());
    });
  };

  const statusBadge = (s) => {
    const colors = { active: 'success', expired: 'secondary', cancelled: 'danger' };
    const labels = { active: 'نشط', expired: 'منتهي', cancelled: 'ملغي' };
    return <span className={`badge bg-${colors[s] || 'secondary'}`}>{labels[s] || s}</span>;
  };

  const policyTypeLabel = (t) => {
    const types = {
      travel: 'سفر', medical: 'طبي', luggage: 'أمتعة', cancellation: 'إلغاء', accident: 'حوادث', other: 'أخرى'
    };
    return types[t] || t;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">التأمين</h5>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="bi bi-plus-lg"></i> وثيقة تأمين جديدة
        </button>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input className="form-control" placeholder="بحث برقم الوثيقة أو اسم العميل..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr><th>رقم الوثيقة</th><th>العميل</th><th>المزود</th><th>النوع</th><th>مبلغ التغطية</th><th>القسط</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {data.rows.map(p => (
                <tr key={p.id}>
                  <td><code>{p.policy_number || '-'}</code></td>
                  <td className="fw-semibold">{p.customer_name || '-'}</td>
                  <td>{p.provider_name || '-'}</td>
                  <td><span className="badge bg-info bg-opacity-10 text-dark">{policyTypeLabel(p.policy_type)}</span></td>
                  <td>{p.coverage_amount ? Number(p.coverage_amount).toLocaleString() : '-'}</td>
                  <td>{p.premium_amount ? Number(p.premium_amount).toLocaleString() : '-'}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(p)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id, p.policy_number)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan="8" className="text-center text-muted py-4">لا توجد وثائق تأمين</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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

      {/* Add / Edit Insurance Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-shield-check me-2"></i>
                  {editItem ? 'تعديل وثيقة التأمين' : 'إضافة وثيقة تأمين جديدة'}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">العميل <span className="text-danger">*</span></label>
                      <select className="form-select" name="customer_id" value={formData.customer_id} onChange={e => setFormData({ ...formData, customer_id: e.target.value })} required>
                        <option value="">اختر العميل</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.full_name || c.name} - {c.phone}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">رقم الحجز (اختياري)</label>
                      <input type="number" className="form-control" name="booking_id" value={formData.booking_id} onChange={e => setFormData({ ...formData, booking_id: e.target.value })} placeholder="رقم الحجز" />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">اسم المزود <span className="text-danger">*</span></label>
                      <input className="form-control" name="provider_name" value={formData.provider_name} onChange={e => setFormData({ ...formData, provider_name: e.target.value })} placeholder="مثال: شركة التأمين العربية" required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">نوع التأمين</label>
                      <select className="form-select" name="policy_type" value={formData.policy_type} onChange={e => setFormData({ ...formData, policy_type: e.target.value })}>
                        <option value="">اختر النوع</option>
                        <option value="travel">سفر</option>
                        <option value="medical">طبي</option>
                        <option value="luggage">أمتعة</option>
                        <option value="cancellation">إلغاء</option>
                        <option value="accident">حوادث</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">مبلغ التغطية</label>
                      <div className="input-group">
                        <input type="number" className="form-control" name="coverage_amount" value={formData.coverage_amount} onChange={e => setFormData({ ...formData, coverage_amount: e.target.value })} min="0" step="0.01" />
                        <span className="input-group-text">{formData.currency}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">القسط</label>
                      <div className="input-group">
                        <input type="number" className="form-control" name="premium_amount" value={formData.premium_amount} onChange={e => setFormData({ ...formData, premium_amount: e.target.value })} min="0" step="0.01" />
                        <span className="input-group-text">{formData.currency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">العملة</label>
                      <select className="form-select" name="currency" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                        <option value="SAR">ريال سعودي</option>
                        <option value="AED">درهم إماراتي</option>
                        <option value="USD">دولار أمريكي</option>
                        <option value="EUR">يورو</option>
                        <option value="EGP">جنيه مصري</option>
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">تاريخ البداية</label>
                      <input type="date" className="form-control" name="start_date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">تاريخ النهاية</label>
                      <input type="date" className="form-control" name="end_date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">الحالة</label>
                      <select className="form-select" name="status" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="active">نشط</option>
                        <option value="expired">منتهي</option>
                        <option value="cancelled">ملغي</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">ملاحظات</label>
                    <textarea className="form-control" name="notes" rows="2" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span> جاري الحفظ...</> : <><i className="bi bi-check-lg me-1"></i> حفظ</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
