import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function Packages() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', destination: '', duration_days: '', includes: '', excludes: '',
    price_per_person: '', currency: 'SAR', status: 'active', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (status) params.status = status;
    api.get('/tour-packages', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page, status]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const resetForm = () => {
    setFormData({
      name: '', description: '', destination: '', duration_days: '', includes: '', excludes: '',
      price_per_person: '', currency: 'SAR', status: 'active', notes: ''
    });
    setEditItem(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name || '', description: item.description || '', destination: item.destination || '',
      duration_days: item.duration_days || '', includes: item.includes || '', excludes: item.excludes || '',
      price_per_person: item.price_per_person || '', currency: item.currency || 'SAR',
      status: item.status || 'active', notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.destination.trim()) {
      Swal.fire('تنبيه', 'أدخل اسم الباقة والوجهة', 'warning'); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        duration_days: formData.duration_days ? Number(formData.duration_days) : null,
        price_per_person: formData.price_per_person ? Number(formData.price_per_person) : null
      };
      if (editItem) {
        await api.put(`/tour-packages/${editItem.id}`, payload);
        Swal.fire('تم التحديث', 'تم تحديث الباقة بنجاح', 'success');
      } else {
        await api.post('/tour-packages', payload);
        Swal.fire('تم الإضافة', 'تم إضافة الباقة بنجاح', 'success');
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

  const handleDelete = (id, name) => {
    Swal.fire({
      title: 'تأكيد الحذف', text: `سيتم حذف الباقة: ${name}`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء'
    }).then(r => {
      if (r.isConfirmed) api.delete(`/tour-packages/${id}`).then(() => { if (detailItem?.id === id) setDetailItem(null); load(); });
    });
  };

  const statusBadge = (s) => {
    const colors = { active: 'success', inactive: 'secondary' };
    const labels = { active: 'نشط', inactive: 'غير نشط' };
    return <span className={`badge bg-${colors[s] || 'secondary'}`}>{labels[s] || s}</span>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">باقات الرحلات</h5>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="bi bi-plus-lg"></i> باقة جديدة
        </button>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-8">
              <div className="search-box">
                <i className="bi bi-search"></i>
                <input className="form-control" placeholder="بحث بالاسم أو كود الباقة..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr><th>الكود</th><th>الاسم</th><th>الوجهة</th><th>المدة (أيام)</th><th>السعر للفرد</th><th>العملة</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {data.rows.map(p => (
                <tr key={p.id}>
                  <td><code>{p.package_code || '-'}</code></td>
                  <td>
                    <button className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold" onClick={() => setDetailItem(p)}>
                      {p.name}
                    </button>
                  </td>
                  <td>{p.destination || '-'}</td>
                  <td>{p.duration_days || '-'}</td>
                  <td>{p.price_per_person ? Number(p.price_per_person).toLocaleString() : '-'}</td>
                  <td>{p.currency || 'SAR'}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setDetailItem(p)}><i className="bi bi-eye"></i></button>
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(p)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id, p.name)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan="8" className="text-center text-muted py-4">لا توجد باقات</td></tr>
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

      {/* Detail View Modal */}
      {detailItem && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-info-circle me-2"></i>تفاصيل الباقة</h5>
                <button type="button" className="btn-close" onClick={() => setDetailItem(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">كود الباقة</h6>
                    <p className="fw-bold">{detailItem.package_code || '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">الاسم</h6>
                    <p className="fw-bold">{detailItem.name}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">الوجهة</h6>
                    <p>{detailItem.destination || '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">المدة (أيام)</h6>
                    <p>{detailItem.duration_days || '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">السعر للفرد</h6>
                    <p className="text-primary fw-bold">{detailItem.price_per_person ? `${Number(detailItem.price_per_person).toLocaleString()} ${detailItem.currency || 'SAR'}` : '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">الحالة</h6>
                    <p>{statusBadge(detailItem.status)}</p>
                  </div>
                  <div className="col-12">
                    <h6 className="text-muted mb-1">الوصف</h6>
                    <p>{detailItem.description || 'لا يوجد وصف'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">يشمل</h6>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{detailItem.includes || '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">لا يشمل</h6>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{detailItem.excludes || '-'}</p>
                  </div>
                  <div className="col-12">
                    <h6 className="text-muted mb-1">ملاحظات</h6>
                    <p>{detailItem.notes || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-warning" onClick={() => { setDetailItem(null); openEdit(detailItem); }}>
                  <i className="bi bi-pencil me-1"></i> تعديل
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setDetailItem(null)}>إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Package Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-box-seam me-2"></i>
                  {editItem ? 'تعديل الباقة' : 'إضافة باقة جديدة'}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">الاسم <span className="text-danger">*</span></label>
                      <input className="form-control" name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">الوجهة <span className="text-danger">*</span></label>
                      <input className="form-control" name="destination" value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })} required />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">الوصف</label>
                    <textarea className="form-control" name="description" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                  </div>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">المدة (أيام)</label>
                      <input type="number" className="form-control" name="duration_days" value={formData.duration_days} onChange={e => setFormData({ ...formData, duration_days: e.target.value })} min="1" />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">السعر للفرد</label>
                      <input type="number" className="form-control" name="price_per_person" value={formData.price_per_person} onChange={e => setFormData({ ...formData, price_per_person: e.target.value })} min="0" step="0.01" />
                    </div>
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
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">الحالة</label>
                      <select className="form-select" name="status" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">يشمل</label>
                      <textarea className="form-control" name="includes" rows="3" value={formData.includes} onChange={e => setFormData({ ...formData, includes: e.target.value })} placeholder="مثال: تذاكر طيران، إقامة، نقل"></textarea>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">لا يشمل</label>
                      <textarea className="form-control" name="excludes" rows="3" value={formData.excludes} onChange={e => setFormData({ ...formData, excludes: e.target.value })} placeholder="مثال: التأمين، المصروفات الشخصية"></textarea>
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
