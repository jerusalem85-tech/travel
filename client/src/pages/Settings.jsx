import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    company_name: '',
    company_phone: '',
    company_email: '',
    company_address: '',
    currency: 'د.ل',
  });
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/settings').then(res => {
      const defaults = { company_name: '', company_phone: '', company_email: '', company_address: '', currency: 'د.ل' };
      setSettings({ ...defaults, ...res.data });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      Swal.fire({ icon: 'success', title: 'تم الحفظ بنجاح', timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: e.response?.data?.error || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current_password || !passwords.new_password) {
      Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'يرجى ملء جميع الحقول' });
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'كلمة المرور الجديدة غير متطابقة' });
      return;
    }
    if (passwords.new_password.length < 6) {
      Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      Swal.fire({ icon: 'success', title: 'تم تغيير كلمة المرور', timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: e.response?.data?.error || 'كلمة المرور الحالية غير صحيحة' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      Swal.fire({ icon: 'success', title: 'تم التصدير بنجاح', timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تصدير النسخة الاحتياطية' });
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <h5 className="page-title mb-4">الإعدادات</h5>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card mb-4">
            <div className="card-header bg-white">
              <h6 className="mb-0"><i className="bi bi-building me-2"></i> معلومات الشركة</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">اسم الشركة</label>
                  <input className="form-control" value={settings.company_name || ''} onChange={e => setSettings({ ...settings, company_name: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">هاتف الشركة</label>
                  <input className="form-control" value={settings.company_phone || ''} onChange={e => setSettings({ ...settings, company_phone: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input type="email" className="form-control" value={settings.company_email || ''} onChange={e => setSettings({ ...settings, company_email: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">العملة</label>
                  <input className="form-control" value={settings.currency || ''} onChange={e => setSettings({ ...settings, currency: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label">العنوان</label>
                  <textarea className="form-control" rows="2" value={settings.company_address || ''} onChange={e => setSettings({ ...settings, company_address: e.target.value })}></textarea>
                </div>
              </div>
              <button className="btn btn-primary mt-3" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-check-lg me-1"></i>}
                حفظ الإعدادات
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0"><i className="bi bi-shield-lock me-2"></i> تغيير كلمة المرور</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">كلمة المرور الحالية</label>
                  <input type="password" className="form-control" value={passwords.current_password} onChange={e => setPasswords({ ...passwords, current_password: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">كلمة المرور الجديدة</label>
                  <input type="password" className="form-control" value={passwords.new_password} onChange={e => setPasswords({ ...passwords, new_password: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">تأكيد كلمة المرور</label>
                  <input type="password" className="form-control" value={passwords.confirm_password} onChange={e => setPasswords({ ...passwords, confirm_password: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-warning mt-3" onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-key me-1"></i>}
                تغيير كلمة المرور
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0"><i className="bi bi-cloud-arrow-down me-2"></i> النسخ الاحتياطي</h6>
            </div>
            <div className="card-body text-center py-4">
              <i className="bi bi-database display-3 text-primary mb-3 d-block"></i>
              <p className="text-secondary mb-3">تصدير نسخة احتياطية من جميع البيانات بصيغة JSON</p>
              <button className="btn btn-primary btn-lg" onClick={handleExportBackup} disabled={exporting}>
                {exporting ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-download me-1"></i>}
                تصدير النسخة الاحتياطية
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
