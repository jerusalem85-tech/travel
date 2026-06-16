import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Swal from 'sweetalert2';

function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'staff'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      setUsers(response.data.rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire('خطأ', 'فشل في تحميل المستخدمين', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'staff'
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'staff'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        await api.put(`/api/users/${editingUser.id}`, updateData);
        Swal.fire('نجاح', 'تم تحديث المستخدم بنجاح', 'success');
      } else {
        if (!formData.password) {
          Swal.fire('خطأ', 'كلمة المرور مطلوبة للمستخدم الجديد', 'error');
          return;
        }
        
        await api.post('/api/users', formData);
        Swal.fire('نجاح', 'تم إضافة المستخدم بنجاح', 'success');
      }
      
      closeModal();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      Swal.fire('خطأ', error.response?.data?.message || 'فشل في حفظ المستخدم', 'error');
    }
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser?.id) {
      Swal.fire('تنبيه', 'لا يمكنك حذف حسابك الخاص', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم حذف هذا المستخدم نهائياً',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/users/${userId}`);
        Swal.fire('نجاح', 'تم حذف المستخدم بنجاح', 'success');
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire('خطأ', error.response?.data?.message || 'فشل في حذف المستخدم', 'error');
      }
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      admin: { text: 'مدير', class: 'bg-danger' },
      staff: { text: 'موظف', class: 'bg-primary' },
      viewer: { text: 'مشاهد', class: 'bg-secondary' }
    };
    return roles[role] || { text: role, class: 'bg-secondary' };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="bi bi-people-fill me-2"></i>
          إدارة المستخدمين
        </h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <i className="bi bi-plus-circle me-1"></i>
          إضافة مستخدم
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">الاسم الكامل</th>
                  <th scope="col">البريد الإلكتروني</th>
                  <th scope="col">الدور</th>
                  <th scope="col">تاريخ الإنشاء</th>
                  <th scope="col" className="text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      لا يوجد مستخدمين
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '35px', height: '35px' }}>
                            <span className="text-white fw-bold">
                              {user.full_name?.charAt(0) || 'م'}
                            </span>
                          </div>
                          {user.full_name}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${getRoleBadge(user.role).class}`}>
                          {getRoleBadge(user.role).text}
                        </span>
                      </td>
                      <td>
                        {new Date(user.created_at).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => openEditModal(user)}
                          title="تعديل"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(user.id)}
                          title="حذف"
                          disabled={user.id === currentUser?.id}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${editingUser ? 'bi-pencil-square' : 'bi-person-plus'} me-2`}></i>
                  {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">الاسم الكامل *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      placeholder="أدخل الاسم الكامل"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="أدخل البريد الإلكتروني"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      كلمة المرور {editingUser ? '(اتركها فارغة لعدم التغيير)' : '*'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingUser}
                      placeholder="أدخل كلمة المرور"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">الدور *</label>
                    <select
                      className="form-select"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="admin">مدير</option>
                      <option value="staff">موظف</option>
                      <option value="viewer">مشاهد</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-check-lg me-1"></i>
                    {editingUser ? 'تحديث' : 'إضافة'}
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

export default Users;