import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings').then(res => {
      const defaults = { company_name: '', company_phone: '', company_email: '', company_address: '', currency: 'د.ل' };
      setSettings({ ...defaults, ...res.data });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    await api.put('/settings', settings);
    Swal.fire({ icon: 'success', title: 'تم الحفظ', timer: 1500, showConfirmButton: false });
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <h5 className="page-title mb-3">الإعدادات</h5>
      <div className="card">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">اسم الشركة</label>
              <input className="form-control" value={settings.company_name || ''} onChange={e => setSettings({...settings, company_name: e.target.value})} />
            </div>
            <div className="col-md-6">
              <label className="form-label">هاتف الشركة</label>
              <input className="form-control" value={settings.company_phone || ''} onChange={e => setSettings({...settings, company_phone: e.target.value})} />
            </div>
            <div className="col-md-6">
              <label className="form-label">البريد الإلكتروني</label>
              <input className="form-control" value={settings.company_email || ''} onChange={e => setSettings({...settings, company_email: e.target.value})} />
            </div>
            <div className="col-md-6">
              <label className="form-label">العملة</label>
              <input className="form-control" value={settings.currency || ''} onChange={e => setSettings({...settings, currency: e.target.value})} />
            </div>
            <div className="col-12">
              <label className="form-label">العنوان</label>
              <textarea className="form-control" rows="2" value={settings.company_address || ''} onChange={e => setSettings({...settings, company_address: e.target.value})}></textarea>
            </div>
          </div>
          <button className="btn btn-primary mt-3" onClick={handleSave}>حفظ الإعدادات</button>
        </div>
      </div>
    </div>
  );
}
