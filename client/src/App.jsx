import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import CreateBooking from './pages/CreateBooking';
import ShowBooking from './pages/ShowBooking';
import EditBooking from './pages/EditBooking';
import Customers from './pages/Customers';
import CreateCustomer from './pages/CreateCustomer';
import ShowCustomer from './pages/ShowCustomer';
import EditCustomer from './pages/EditCustomer';
import Suppliers from './pages/Suppliers';
import CreateSupplier from './pages/CreateSupplier';
import ShowSupplier from './pages/ShowSupplier';
import EditSupplier from './pages/EditSupplier';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import ShowInvoice from './pages/ShowInvoice';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Quotations from './pages/Quotations';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Hotels from './pages/Hotels';
import Packages from './pages/Packages';
import Insurance from './pages/Insurance';
import Airlines from './pages/Airlines';
import Airports from './pages/Airports';
import Flights from './pages/Flights';
import Services from './pages/Services';
import Contracts from './pages/Contracts';
import Commissions from './pages/Commissions';
import ActivityLog from './pages/ActivityLog';
import Currencies from './pages/Currencies';
import Communications from './pages/Communications';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/create" element={<CreateBooking />} />
            <Route path="bookings/:id" element={<ShowBooking />} />
            <Route path="bookings/:id/edit" element={<EditBooking />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/create" element={<CreateCustomer />} />
            <Route path="customers/:id" element={<ShowCustomer />} />
            <Route path="customers/:id/edit" element={<EditCustomer />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/create" element={<CreateSupplier />} />
            <Route path="suppliers/:id" element={<ShowSupplier />} />
            <Route path="suppliers/:id/edit" element={<EditSupplier />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/create" element={<CreateInvoice />} />
            <Route path="invoices/:id" element={<ShowInvoice />} />
            <Route path="payments" element={<Payments />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="users" element={<Users />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="services" element={<Services />} />
            <Route path="airlines" element={<Airlines />} />
            <Route path="airports" element={<Airports />} />
            <Route path="flights" element={<Flights />} />
            <Route path="hotels" element={<Hotels />} />
            <Route path="packages" element={<Packages />} />
            <Route path="insurance" element={<Insurance />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="commissions" element={<Commissions />} />
            <Route path="activity-log" element={<ActivityLog />} />
            <Route path="currencies" element={<Currencies />} />
            <Route path="communications" element={<Communications />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
