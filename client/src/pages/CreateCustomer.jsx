import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateCustomer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_number: '',
    passport_number: '',
    nationality: '',
    address: '',
    notes: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/customers', form);
      Swal.fire({ icon: 'success', title: 'Customer created successfully', timer: 1500, showConfirmButton: false });
      navigate(`/customers/${res.data.id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'An error occurred while creating the customer' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">New Customer</h5>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/customers')}>Back</button>
      </div>
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name <span className="text-danger">*</span></label>
                <input type="text" className="form-control" name="full_name" value={form.full_name} onChange={handleChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-control" name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" name="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">ID Number</label>
                <input type="text" className="form-control" name="id_number" value={form.id_number} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Passport Number</label>
                <input type="text" className="form-control" name="passport_number" value={form.passport_number} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Nationality</label>
                <input type="text" className="form-control" name="nationality" value={form.nationality} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">Address</label>
                <input type="text" className="form-control" name="address" value={form.address} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows="2" name="notes" value={form.notes} onChange={handleChange}></textarea>
              </div>
            </div>
            <div className="mt-3">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1"></span> Saving...</> : <><i className="bi bi-check-lg"></i> Create Customer</>}
              </button>
              <button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate('/customers')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
