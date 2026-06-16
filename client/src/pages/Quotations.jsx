import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Quotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    travel_date: '',
    return_date: '',
    from_destination: '',
    to_destination: '',
    airline: '',
    flight_number: '',
    service_type: '',
    total_amount: '',
    cost_amount: '',
    notes: ''
  });
  const limit = 10;

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/quotations?${params.toString()}`);
      setQuotations(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      Swal.fire('خطأ', 'فشل تحميل عروض الأسعار', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.rows || res.data || []);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchQuotations();
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      travel_date: '',
      return_date: '',
      from_destination: '',
      to_destination: '',
      airline: '',
      flight_number: '',
      service_type: '',
      total_amount: '',
      cost_amount: '',
      notes: ''
    });
  };

  const openCreate = () => {
    resetForm();
    setEditMode(false);
    setSelectedQuotation(null);
    setViewMode('form');
  };

  const openEdit = async (quotation) => {
    try {
      const res = await api.get(`/quotations/${quotation.id}`);
      const q = res.data;
      setFormData({
        customer_id: q.customer_id || '',
        travel_date: q.travel_date ? q.travel_date.split('T')[0] : '',
        return_date: q.return_date ? q.return_date.split('T')[0] : '',
        from_destination: q.from_destination || '',
        to_destination: q.to_destination || '',
        airline: q.airline || '',
        flight_number: q.flight_number || '',
        service_type: q.service_type || '',
        total_amount: q.total_amount || '',
        cost_amount: q.cost_amount || '',
        notes: q.notes || ''
      });
      setSelectedQuotation(q);
      setEditMode(true);
      setViewMode('form');
    } catch (err) {
      Swal.fire('خطأ', 'فشل تحميل عرض السعر', 'error');
    }
  };

  const openView = async (quotation) => {
    try {
      const res = await api.get(`/quotations/${quotation.id}`);
      setSelectedQuotation(res.data);
      setViewMode('detail');
    } catch (err) {
      Swal.fire('خطأ', 'فشل تحميل عرض السعر', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      Swal.fire('تنبيه', 'اختر العميل', 'warning');
      return;
    }
    if (!formData.from_destination || !formData.to_destination) {
      Swal.fire('تنبيه', 'أدخل وجهات السفر', 'warning');
      return;
    }
    if (!formData.total_amount || Number(formData.total_amount) <= 0) {
      Swal.fire('تنبيه', 'أدخل المبلغ الإجمالي', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: Number(formData.customer_id),
        travel_date: formData.travel_date || null,
        return_date: formData.return_date || null,
        from_destination: formData.from_destination,
        to_destination: formData.to_destination,
        airline: formData.airline,
        flight_number: formData.flight_number,
        service_type: formData.service_type,
        total_amount: Number(formData.total_amount),
        cost_amount: formData.cost_amount ? Number(formData.cost_amount) : null,
        notes: formData.notes
      };

      if (editMode && selectedQuotation) {
        await api.put(`/quotations/${selectedQuotation.id}`, payload);
        Swal.fire({
          title: 'تم التحديث',
          text: 'تم تحديث عرض السعر بنجاح',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        await api.post('/quotations', payload);
        Swal.fire({
          title: 'تم الإنشاء',
          text: 'تم إنشاء عرض السعر بنجاح',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
      setViewMode('list');
      resetForm();
      fetchQuotations();
    } catch (err) {
      Swal.fire('خطأ', err.response?.data?.message || 'فشل حفظ عرض السعر', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const statusLabels = {
      draft: 'مسودة',
      sent: 'مرسل',
      accepted: 'مقبول',
      rejected: 'مرفوض'
    };
    Swal.fire({
      title: 'تغيير الحالة',
      text: `هل تريد تغيير الحالة إلى "${statusLabels[newStatus]}"؟`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، غيّر',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.put(`/quotations/${id}/status`, { status: newStatus });
          Swal.fire({
            title: 'تم التغيير',
            text: 'تم تغيير الحالة بنجاح',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          fetchQuotations();
          if (selectedQuotation && selectedQuotation.id === id) {
            setSelectedQuotation((prev) => ({ ...prev, status: newStatus }));
          }
        } catch (err) {
          Swal.fire('خطأ', 'فشل تغيير الحالة', 'error');
        }
      }
    });
  };

  const handleDelete = (id, quoteNumber) => {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: `سيتم حذف عرض السعر ${quoteNumber}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/quotations/${id}`);
          Swal.fire('تم الحذف', 'تم حذف عرض السعر بنجاح', 'success');
          fetchQuotations();
        } catch (err) {
          Swal.fire('خطأ', 'فشل حذف عرض السعر', 'error');
        }
      }
    });
  };

  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <span className="badge bg-secondary">مسودة</span>;
      case 'sent':
        return <span className="badge bg-primary">مرسل</span>;
      case 'accepted':
        return <span className="badge bg-success">مقبول</span>;
      case 'rejected':
        return <span className="badge bg-danger">مرفوض</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const getProfit = () => {
    if (!selectedQuotation) return 0;
    return Number(selectedQuotation.total_amount) - Number(selectedQuotation.cost_amount || 0);
  };

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">
            <i className="bi bi-file-earmark-text me-2"></i>
            عروض الأسعار
          </h4>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i>
            إضافة عرض سعر
          </button>
        </div>

        <div className="card mb-4">
          <div className="card-body">
            <form onSubmit={handleSearch}>
              <div className="row g-3">
                <div className="col-md-5">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="بحث برقم العرض أو اسم العميل..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">جميع الحالات</option>
                    <option value="draft">مسودة</option>
                    <option value="sent">مرسل</option>
                    <option value="accepted">مقبول</option>
                    <option value="rejected">مرفوض</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <button type="submit" className="btn btn-outline-primary w-100">
                    <i className="bi bi-search me-1"></i>
                    بحث
                  </button>
                </div>
                <div className="col-md-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100"
                    onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                    إعادة تعيين
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">جاري التحميل...</span>
                </div>
              </div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                لا توجد عروض أسعار
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>رقم العرض</th>
                        <th>العميل</th>
                        <th>من</th>
                        <th>إلى</th>
                        <th>تاريخ السفر</th>
                        <th>المبلغ</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                        <th>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.map((q) => (
                        <tr key={q.id}>
                          <td>{q.id}</td>
                          <td><code>{q.quote_number}</code></td>
                          <td>{q.customer_name}</td>
                          <td>{q.from_destination}</td>
                          <td>{q.to_destination}</td>
                          <td>
                            {q.travel_date
                              ? new Date(q.travel_date).toLocaleDateString('ar-SA')
                              : '-'}
                          </td>
                          <td className="fw-bold">
                            {Number(q.total_amount).toLocaleString()} ر.س
                          </td>
                          <td>{getStatusBadge(q.status)}</td>
                          <td>{new Date(q.created_at).toLocaleDateString('ar-SA')}</td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-info"
                                title="عرض"
                                onClick={() => openView(q)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              <button
                                className="btn btn-outline-warning"
                                title="تعديل"
                                onClick={() => openEdit(q)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                title="حذف"
                                onClick={() => handleDelete(q.id, q.quote_number)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

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
                              <li className="page-item disabled">
                                <span className="page-link">...</span>
                              </li>
                            )}
                            <li className={`page-item ${page === p ? 'active' : ''}`}>
                              <button className="page-link" onClick={() => setPage(p)}>
                                {p}
                              </button>
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
      </div>
    );
  }

  // FORM VIEW (Create/Edit)
  if (viewMode === 'form') {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">
            <i className={`bi ${editMode ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
            {editMode ? 'تعديل عرض السعر' : 'إضافة عرض سعر جديد'}
          </h4>
          <button
            className="btn btn-outline-secondary"
            onClick={() => setViewMode('list')}
          >
            <i className="bi bi-arrow-right me-1"></i>
            رجوع
          </button>
        </div>

        <div className="row">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">العميل <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        name="customer_id"
                        value={formData.customer_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">اختر العميل</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} - {c.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">نوع الخدمة</label>
                      <select
                        className="form-select"
                        name="service_type"
                        value={formData.service_type}
                        onChange={handleChange}
                      >
                        <option value="">اختر نوع الخدمة</option>
                        <option value="flight">تذكرة طيران</option>
                        <option value="hotel">فندق</option>
                        <option value="visa">تأشيرة</option>
                        <option value="package">باقة سياحية</option>
                        <option value="transfer">نقل</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">من وجهة <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="from_destination"
                        value={formData.from_destination}
                        onChange={handleChange}
                        placeholder="مثال: الرياض"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">إلى وجهة <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="to_destination"
                        value={formData.to_destination}
                        onChange={handleChange}
                        placeholder="مثال: دبي"
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">تاريخ السفر</label>
                      <input
                        type="date"
                        className="form-control"
                        name="travel_date"
                        value={formData.travel_date}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">تاريخ العودة</label>
                      <input
                        type="date"
                        className="form-control"
                        name="return_date"
                        value={formData.return_date}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">شركة الطيران</label>
                      <input
                        type="text"
                        className="form-control"
                        name="airline"
                        value={formData.airline}
                        onChange={handleChange}
                        placeholder="مثال: الخطوط السعودية"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">رقم الرحلة</label>
                      <input
                        type="text"
                        className="form-control"
                        name="flight_number"
                        value={formData.flight_number}
                        onChange={handleChange}
                        placeholder="مثال: SV123"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">المبلغ الإجمالي <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="total_amount"
                          value={formData.total_amount}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          required
                        />
                        <span className="input-group-text">ر.س</span>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">التكلفة</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="cost_amount"
                          value={formData.cost_amount}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                        <span className="input-group-text">ر.س</span>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">صافي الربح</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={`${(
                            Number(formData.total_amount || 0) - Number(formData.cost_amount || 0)
                          ).toLocaleString()} ر.س`}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">ملاحظات</label>
                    <textarea
                      className="form-control"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="3"
                      placeholder="ملاحظات إضافية..."
                    ></textarea>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1"></span>
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-1"></i>
                          {editMode ? 'تحديث عرض السعر' : 'إنشاء عرض السعر'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setViewMode('list')}
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-info-circle me-1"></i>
                  معلومات
                </h6>
                <ul className="list-unstyled mb-0 small text-muted">
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-1"></i>
                    اختر العميل ووجهات السفر
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-1"></i>
                    التكلفة اختيارية لحساب الربح
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-1"></i>
                    الحالة الافتراضية "مسودة"
                  </li>
                  <li>
                    <i className="bi bi-check-circle text-success me-1"></i>
                    يمكن تغيير الحالة من صفحة العرض
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DETAIL VIEW
  if (viewMode === 'detail' && selectedQuotation) {
    const q = selectedQuotation;
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">
            <i className="bi bi-file-earmark-text me-2"></i>
            تفاصيل عرض السعر
          </h4>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setViewMode('list')}
            >
              <i className="bi bi-arrow-right me-1"></i>
              رجوع
            </button>
            <button
              className="btn btn-outline-warning"
              onClick={() => openEdit(q)}
            >
              <i className="bi bi-pencil me-1"></i>
              تعديل
            </button>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  عرض رقم: <code>{q.quote_number}</code>
                </h5>
                {getStatusBadge(q.status)}
              </div>
              <div className="card-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3">
                      <i className="bi bi-person me-1"></i>
                      معلومات العميل
                    </h6>
                    <table className="table table-borderless table-sm">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '120px' }}>الاسم:</td>
                          <td className="fw-bold">{q.customer_name}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">الهاتف:</td>
                          <td>{q.customer_phone}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">البريد:</td>
                          <td>{q.customer_email || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3">
                      <i className="bi bi-info-circle me-1"></i>
                      تفاصيل العرض
                    </h6>
                    <table className="table table-borderless table-sm">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '120px' }}>التاريخ:</td>
                          <td>{new Date(q.created_at).toLocaleDateString('ar-SA')}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">نوع الخدمة:</td>
                          <td>{q.service_type || '-'}</td>
                        </tr>
                        {q.notes && (
                          <tr>
                            <td className="text-muted">ملاحظات:</td>
                            <td>{q.notes}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <h6 className="text-muted mb-3">
                  <i className="bi bi-geo-alt me-1"></i>
                  تفاصيل الرحلة
                </h6>
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card border-primary">
                      <div className="card-body text-center">
                        <i className="bi bi-geo-alt-fill text-primary fs-4"></i>
                        <div className="small text-muted mt-1">من</div>
                        <strong>{q.from_destination}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-success">
                      <div className="card-body text-center">
                        <i className="bi bi-geo-alt-fill text-success fs-4"></i>
                        <div className="small text-muted mt-1">إلى</div>
                        <strong>{q.to_destination}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-info">
                      <div className="card-body text-center">
                        <i className="bi bi-calendar-event text-info fs-4"></i>
                        <div className="small text-muted mt-1">تاريخ السفر</div>
                        <strong>
                          {q.travel_date
                            ? new Date(q.travel_date).toLocaleDateString('ar-SA')
                            : '-'}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-warning">
                      <div className="card-body text-center">
                        <i className="bi bi-calendar-minus text-warning fs-4"></i>
                        <div className="small text-muted mt-1">تاريخ العودة</div>
                        <strong>
                          {q.return_date
                            ? new Date(q.return_date).toLocaleDateString('ar-SA')
                            : '-'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {(q.airline || q.flight_number) && (
                  <>
                    <h6 className="text-muted mb-3">
                      <i className="bi bi-airplane me-1"></i>
                      تفاصيل الرحلة الجوية
                    </h6>
                    <div className="row mb-4">
                      {q.airline && (
                        <div className="col-md-6">
                          <strong>شركة الطيران:</strong> {q.airline}
                        </div>
                      )}
                      {q.flight_number && (
                        <div className="col-md-6">
                          <strong>رقم الرحلة:</strong> <code>{q.flight_number}</code>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="row text-center">
                  <div className="col-md-4">
                    <div className="card bg-primary text-white">
                      <div className="card-body">
                        <div className="small text-white-50">المبلغ للعميل</div>
                        <h4 className="mb-0">{Number(q.total_amount).toLocaleString()} ر.س</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-warning text-dark">
                      <div className="card-body">
                        <div className="small text-dark-50">التكلفة</div>
                        <h4 className="mb-0">{Number(q.cost_amount || 0).toLocaleString()} ر.س</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className={`card ${getProfit() >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                      <div className="card-body">
                        <div className="small text-white-50">صافي الربح</div>
                        <h4 className="mb-0">{getProfit().toLocaleString()} ر.س</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card mb-4">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-arrow-repeat me-1"></i>
                  تغيير الحالة
                </h6>
                <div className="d-grid gap-2">
                  {q.status !== 'draft' && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => handleStatusChange(q.id, 'draft')}
                    >
                      <i className="bi bi-pencil-square me-1"></i>
                      مسودة
                    </button>
                  )}
                  {q.status !== 'sent' && (
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleStatusChange(q.id, 'sent')}
                    >
                      <i className="bi bi-send me-1"></i>
                      مرسل
                    </button>
                  )}
                  {q.status !== 'accepted' && (
                    <button
                      className="btn btn-outline-success"
                      onClick={() => handleStatusChange(q.id, 'accepted')}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      مقبول
                    </button>
                  )}
                  {q.status !== 'rejected' && (
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleStatusChange(q.id, 'rejected')}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      مرفوض
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-pie-chart me-1"></i>
                  ملخص العرض
                </h6>
                <div className="d-flex justify-content-between mb-2">
                  <span>المبلغ للعميل:</span>
                  <strong>{Number(q.total_amount).toLocaleString()} ر.س</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>التكلفة:</span>
                  <strong>{Number(q.cost_amount || 0).toLocaleString()} ر.س</strong>
                </div>
                <hr />
                <div className="d-flex justify-content-between">
                  <span>صافي الربح:</span>
                  <strong className={getProfit() >= 0 ? 'text-success' : 'text-danger'}>
                    {getProfit().toLocaleString()} ر.س
                  </strong>
                </div>
                {Number(q.total_amount) > 0 && (
                  <>
                    <div className="progress mt-3" style={{ height: '10px' }}>
                      <div
                        className="progress-bar bg-success"
                        style={{
                          width: `${Math.min((getProfit() / Number(q.total_amount)) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="text-center small text-muted mt-1">
                      هامش الربح: {Math.round((getProfit() / Number(q.total_amount)) * 100)}%
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Quotations;
