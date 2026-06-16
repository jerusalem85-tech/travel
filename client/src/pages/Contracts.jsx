import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    contract_type: 'supplier',
    party_name: '',
    party_phone: '',
    party_email: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    terms: '',
    total_amount: '',
    currency: 'SAR',
    status: 'active',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const limit = 10;

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);
      if (typeFilter) params.append('contract_type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/contracts?${params.toString()}`);
      setContracts(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      Swal.fire('خطأ', 'فشل تحميل العقود', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      contract_type: 'supplier',
      party_name: '',
      party_phone: '',
      party_email: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      terms: '',
      total_amount: '',
      currency: 'SAR',
      status: 'active',
      notes: ''
    });
    setEditId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (contract) => {
    setEditId(contract.id);
    setFormData({
      contract_type: contract.contract_type || 'supplier',
      party_name: contract.party_name || '',
      party_phone: contract.party_phone || '',
      party_email: contract.party_email || '',
      start_date: contract.start_date ? contract.start_date.split('T')[0] : '',
      end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
      terms: contract.terms || '',
      total_amount: contract.total_amount || '',
      currency: contract.currency || 'SAR',
      status: contract.status || 'active',
      notes: contract.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party_name.trim()) {
      Swal.fire('تنبيه', 'أدخل اسم الطرف', 'warning');
      return;
    }
    if (!formData.total_amount || Number(formData.total_amount) <= 0) {
      Swal.fire('تنبيه', 'أدخل مبلغ صحيح', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        ...formData,
        total_amount: Number(formData.total_amount)
      };

      if (editId) {
        await api.put(`/contracts/${editId}`, body);
        Swal.fire({ title: 'تم التحديث', text: 'تم تحديث العقد بنجاح', icon: 'success', timer: 2000, showConfirmButton: false });
      } else {
        await api.post('/contracts', body);
        Swal.fire({ title: 'تم الإضافة', text: 'تم إضافة العقد بنجاح', icon: 'success', timer: 2000, showConfirmButton: false });
      }

      setShowModal(false);
      resetForm();
      fetchContracts();
    } catch (err) {
      Swal.fire('خطأ', err.response?.data?.message || 'فشل حفظ العقد', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: `سيتم حذف العقد: ${name}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/contracts/${id}`);
          Swal.fire('تم الحذف', 'تم حذف العقد بنجاح', 'success');
          fetchContracts();
        } catch (err) {
          Swal.fire('خطأ', 'فشل حذف العقد', 'error');
        }
      }
    });
  };

  const getStatusBadge = (status) => {
    const map = {
      active: 'bg-success',
      expired: 'bg-secondary',
      cancelled: 'bg-danger'
    };
    const labels = {
      active: 'نشط',
      expired: 'منتهي',
      cancelled: 'ملغي'
    };
    return <span className={`badge ${map[status] || 'bg-secondary'}`}>{labels[status] || status}</span>;
  };

  const getTypeLabel = (type) => {
    const map = { supplier: 'مورد', customer: 'عميل', partner: 'شريك' };
    return map[type] || type;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-file-earmark-text me-2"></i>
          العقود
        </h4>
        <button className="btn btn-primary" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-1"></i>
          إضافة عقد
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">بحث</label>
              <input
                type="text"
                className="form-control"
                placeholder="بحث باسم الطرف أو رقم العقد..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">نوع العقد</label>
              <select className="form-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="">الكل</option>
                <option value="supplier">مورد</option>
                <option value="customer">عميل</option>
                <option value="partner">شريك</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">الحالة</label>
              <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">الكل</option>
                <option value="active">نشط</option>
                <option value="expired">منتهي</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setPage(1); }}>
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              لا توجد عقود
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>رقم العقد</th>
                      <th>النوع</th>
                      <th>الطرف</th>
                      <th>الهاتف</th>
                      <th>تاريخ البداية</th>
                      <th>تاريخ النهاية</th>
                      <th>المبلغ</th>
                      <th>الحالة</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c) => (
                      <tr key={c.id}>
                        <td><code>{c.contract_number}</code></td>
                        <td>{getTypeLabel(c.contract_type)}</td>
                        <td>{c.party_name}</td>
                        <td>{c.party_phone || '-'}</td>
                        <td>{c.start_date ? new Date(c.start_date).toLocaleDateString('ar-SA') : '-'}</td>
                        <td>{c.end_date ? new Date(c.end_date).toLocaleDateString('ar-SA') : '-'}</td>
                        <td className="fw-bold">{Number(c.total_amount).toLocaleString()} {c.currency || 'ر.س'}</td>
                        <td>{getStatusBadge(c.status)}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-info" onClick={() => setShowDetail(showDetail === c.id ? null : c.id)} title="عرض التفاصيل">
                              <i className="bi bi-eye"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-warning" onClick={() => openEditModal(c)} title="تعديل">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id, c.contract_number)} title="حذف">
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detail View */}
              {showDetail && (() => {
                const contract = contracts.find((c) => c.id === showDetail);
                if (!contract) return null;
                return (
                  <div className="card bg-light mb-3">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <span><i className="bi bi-file-text me-1"></i> تفاصيل العقد {contract.contract_number}</span>
                      <button className="btn btn-sm btn-close" onClick={() => setShowDetail(null)}></button>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6 mb-2"><strong>الطرف:</strong> {contract.party_name}</div>
                        <div className="col-md-6 mb-2"><strong>الهاتف:</strong> {contract.party_phone || '-'}</div>
                        <div className="col-md-6 mb-2"><strong>البريد:</strong> {contract.party_email || '-'}</div>
                        <div className="col-md-6 mb-2"><strong>النوع:</strong> {getTypeLabel(contract.contract_type)}</div>
                        <div className="col-md-6 mb-2"><strong>تاريخ البداية:</strong> {contract.start_date ? new Date(contract.start_date).toLocaleDateString('ar-SA') : '-'}</div>
                        <div className="col-md-6 mb-2"><strong>تاريخ النهاية:</strong> {contract.end_date ? new Date(contract.end_date).toLocaleDateString('ar-SA') : '-'}</div>
                        <div className="col-md-6 mb-2"><strong>المبلغ:</strong> {Number(contract.total_amount).toLocaleString()} {contract.currency || 'ر.س'}</div>
                        <div className="col-md-6 mb-2"><strong>الحالة:</strong> {getStatusBadge(contract.status)}</div>
                      </div>
                      {contract.terms && (
                        <div className="mt-2">
                          <strong>الشروط:</strong>
                          <p className="mb-0 mt-1 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{contract.terms}</p>
                        </div>
                      )}
                      {contract.notes && (
                        <div className="mt-2">
                          <strong>ملاحظات:</strong>
                          <p className="mb-0 mt-1 text-muted">{contract.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {totalPages > 1 && (
                <nav>
                  <ul className="pagination justify-content-center mb-0">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page - 1)}>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <li className="page-item disabled"><span className="page-link">...</span></li>
                          )}
                          <li className={`page-item ${page === p ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                          </li>
                        </React.Fragment>
                      ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page + 1)}>
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${editId ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editId ? 'تعديل العقد' : 'إضافة عقد جديد'}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">نوع العقد <span className="text-danger">*</span></label>
                      <select className="form-select" name="contract_type" value={formData.contract_type} onChange={handleChange} required>
                        <option value="supplier">مورد</option>
                        <option value="customer">عميل</option>
                        <option value="partner">شريك</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">الحالة</label>
                      <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                        <option value="active">نشط</option>
                        <option value="expired">منتهي</option>
                        <option value="cancelled">ملغي</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">اسم الطرف <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" name="party_name" value={formData.party_name} onChange={handleChange} placeholder="اسم الطرف..." required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">هاتف الطرف</label>
                      <input type="text" className="form-control" name="party_phone" value={formData.party_phone} onChange={handleChange} placeholder="رقم الهاتف..." />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">البريد الإلكتروني</label>
                    <input type="email" className="form-control" name="party_email" value={formData.party_email} onChange={handleChange} placeholder="البريد الإلكتروني..." />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">تاريخ البداية</label>
                      <input type="date" className="form-control" name="start_date" value={formData.start_date} onChange={handleChange} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">تاريخ النهاية</label>
                      <input type="date" className="form-control" name="end_date" value={formData.end_date} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">الشروط</label>
                    <textarea className="form-control" name="terms" value={formData.terms} onChange={handleChange} rows="3" placeholder="شروط العقد..."></textarea>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">المبلغ الإجمالي <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input type="number" className="form-control" name="total_amount" value={formData.total_amount} onChange={handleChange} min="0" step="0.01" placeholder="0.00" required />
                        <span className="input-group-text">ر.س</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">العملة</label>
                      <select className="form-select" name="currency" value={formData.currency} onChange={handleChange}>
                        <option value="SAR">ريال سعودي</option>
                        <option value="USD">دولار أمريكي</option>
                        <option value="EUR">يورو</option>
                        <option value="GBP">جنيه إسترليني</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">ملاحظات</label>
                    <textarea className="form-control" name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder="ملاحظات إضافية..."></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>جاري الحفظ...</>
                    ) : (
                      <><i className="bi bi-check-lg me-1"></i>{editId ? 'تحديث العقد' : 'حفظ العقد'}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
