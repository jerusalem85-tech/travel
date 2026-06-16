import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function Hotels() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [roomTypes, setRoomTypes] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', address: '', city: '', country: '', phone: '', email: '',
    star_rating: '', contact_person: '', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showRtModal, setShowRtModal] = useState(false);
  const [rtForm, setRtForm] = useState({ room_type: '', board_basis: '', price_per_night: '', currency: 'SAR' });
  const [rtSubmitting, setRtSubmitting] = useState(false);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    api.get('/hotels', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const resetForm = () => {
    setFormData({ name: '', address: '', city: '', country: '', phone: '', email: '', star_rating: '', contact_person: '', notes: '' });
    setEditItem(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name || '', address: item.address || '', city: item.city || '', country: item.country || '',
      phone: item.phone || '', email: item.email || '', star_rating: item.star_rating || '',
      contact_person: item.contact_person || '', notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { Swal.fire('تنبيه', 'أدخل اسم الفندق', 'warning'); return; }
    setSubmitting(true);
    try {
      const payload = { ...formData, star_rating: formData.star_rating ? Number(formData.star_rating) : null };
      if (editItem) {
        await api.put(`/hotels/${editItem.id}`, payload);
        Swal.fire('تم التحديث', 'تم تحديث بيانات الفندق', 'success');
      } else {
        await api.post('/hotels', payload);
        Swal.fire('تم الإضافة', 'تم إضافة الفندق بنجاح', 'success');
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
      title: 'تأكيد الحذف', text: `سيتم حذف الفندق: ${name}`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء'
    }).then(r => {
      if (r.isConfirmed) api.delete(`/hotels/${id}`).then(() => { if (expandedId === id) setExpandedId(null); load(); });
    });
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!roomTypes[id]) {
      try {
        const res = await api.get(`/hotels/${id}`);
        setRoomTypes(prev => ({ ...prev, [id]: res.data.room_types || [] }));
      } catch { setRoomTypes(prev => ({ ...prev, [id]: [] })); }
    }
  };

  const resetRtForm = () => setRtForm({ room_type: '', board_basis: '', price_per_night: '', currency: 'SAR' });

  const handleAddRt = async (e) => {
    e.preventDefault();
    if (!rtForm.room_type.trim() || !rtForm.price_per_night) {
      Swal.fire('تنبيه', 'أدخل نوع الغرفة والسعر', 'warning'); return;
    }
    setRtSubmitting(true);
    try {
      await api.post(`/hotels/${expandedId}/room-types`, {
        ...rtForm, price_per_night: Number(rtForm.price_per_night)
      });
      Swal.fire('تم الإضافة', 'تم إضافة نوع الغرفة', 'success');
      setShowRtModal(false);
      resetRtForm();
      const res = await api.get(`/hotels/${expandedId}`);
      setRoomTypes(prev => ({ ...prev, [expandedId]: res.data.room_types || [] }));
    } catch (err) {
      Swal.fire('خطأ', err.response?.data?.message || 'فشل الإضافة', 'error');
    } finally {
      setRtSubmitting(false);
    }
  };

  const handleDeleteRt = (rtId) => {
    Swal.fire({
      title: 'تأكيد الحذف', text: 'سيتم حذف نوع الغرفة', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء'
    }).then(async (r) => {
      if (r.isConfirmed) {
        try {
          await api.delete(`/hotels/room-types/${rtId}`);
          const res = await api.get(`/hotels/${expandedId}`);
          setRoomTypes(prev => ({ ...prev, [expandedId]: res.data.room_types || [] }));
        } catch { Swal.fire('خطأ', 'فشل الحذف', 'error'); }
      }
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">الفنادق</h5>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="bi bi-plus-lg"></i> فندق جديد
        </button>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input className="form-control" placeholder="بحث بالاسم أو المدينة..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr><th>الاسم</th><th>المدينة</th><th>الدولة</th><th>التقييم</th><th>الهاتف</th><th>جهة الاتصال</th><th></th></tr>
            </thead>
            <tbody>
              {data.rows.map(h => (
                <tr key={h.id}>
                  <td>
                    <button className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold" onClick={() => toggleExpand(h.id)}>
                      {h.name} <i className={`bi bi-chevron-${expandedId === h.id ? 'up' : 'down'} ms-1 small`}></i>
                    </button>
                  </td>
                  <td>{h.city || '-'}</td>
                  <td>{h.country || '-'}</td>
                  <td>{h.star_rating ? '★'.repeat(h.star_rating) : '-'}</td>
                  <td>{h.phone || '-'}</td>
                  <td>{h.contact_person || '-'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(h)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(h.id, h.name)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan="7" className="text-center text-muted py-4">لا توجد فنادق</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {expandedId && (
          <div className="card-footer bg-light">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">أنواع الغرف</h6>
              <button className="btn btn-sm btn-primary" onClick={() => { resetRtForm(); setShowRtModal(true); }}>
                <i className="bi bi-plus-lg"></i> إضافة نوع غرفة
              </button>
            </div>
            {(!roomTypes[expandedId] || roomTypes[expandedId].length === 0) ? (
              <p className="text-muted small mb-0">لا توجد غرف مضافة</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr><th>نوع الغرفة</th><th>نظام الإقامة</th><th>السعر لليلة</th><th>العملة</th><th></th></tr>
                  </thead>
                  <tbody>
                    {roomTypes[expandedId].map(rt => (
                      <tr key={rt.id}>
                        <td>{rt.room_type}</td>
                        <td>{rt.board_basis || '-'}</td>
                        <td>{Number(rt.price_per_night).toLocaleString()}</td>
                        <td>{rt.currency || 'SAR'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteRt(rt.id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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

      {/* Add / Edit Hotel Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-building me-2"></i>
                  {editItem ? 'تعديل الفندق' : 'إضافة فندق جديد'}
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
                      <label className="form-label">التقييم (نجوم)</label>
                      <select className="form-select" name="star_rating" value={formData.star_rating} onChange={e => setFormData({ ...formData, star_rating: e.target.value })}>
                        <option value="">اختر التقييم</option>
                        {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">المدينة</label>
                      <input className="form-control" name="city" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">الدولة</label>
                      <input className="form-control" name="country" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">العنوان</label>
                    <input className="form-control" name="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">الهاتف</label>
                      <input className="form-control" name="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">البريد الإلكتروني</label>
                      <input type="email" className="form-control" name="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">جهة الاتصال</label>
                      <input className="form-control" name="contact_person" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} />
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

      {/* Add Room Type Modal */}
      {showRtModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-door-open me-2"></i>إضافة نوع غرفة</h5>
                <button type="button" className="btn-close" onClick={() => { setShowRtModal(false); resetRtForm(); }}></button>
              </div>
              <form onSubmit={handleAddRt}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">نوع الغرفة <span className="text-danger">*</span></label>
                    <input className="form-control" name="room_type" value={rtForm.room_type} onChange={e => setRtForm({ ...rtForm, room_type: e.target.value })} placeholder="مثال: غرفة مفردة، غرفة مزدوجة" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">نظام الإقامة</label>
                    <select className="form-select" name="board_basis" value={rtForm.board_basis} onChange={e => setRtForm({ ...rtForm, board_basis: e.target.value })}>
                      <option value="">اختر النظام</option>
                      <option value="سرير وإفطار">سرير وإفطار</option>
                      <option value="نصف إقامة">نصف إقامة</option>
                      <option value="إقامة كاملة">إقامة كاملة</option>
                      <option value="شامل">شامل</option>
                      <option value="بدون طعام">بدون طعام</option>
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">السعر لليلة <span className="text-danger">*</span></label>
                      <input type="number" className="form-control" name="price_per_night" value={rtForm.price_per_night} onChange={e => setRtForm({ ...rtForm, price_per_night: e.target.value })} min="0" step="0.01" required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">العملة</label>
                      <select className="form-select" name="currency" value={rtForm.currency} onChange={e => setRtForm({ ...rtForm, currency: e.target.value })}>
                        <option value="SAR">ريال سعودي</option>
                        <option value="AED">درهم إماراتي</option>
                        <option value="USD">دولار أمريكي</option>
                        <option value="EUR">يورو</option>
                        <option value="EGP">جنيه مصري</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowRtModal(false); resetRtForm(); }}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={rtSubmitting}>
                    {rtSubmitting ? <><span className="spinner-border spinner-border-sm me-1"></span> جاري الحفظ...</> : <><i className="bi bi-check-lg me-1"></i> حفظ</>}
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
