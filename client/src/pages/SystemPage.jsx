import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Dashboard & Analytics',
    icon: 'bi-speedometer2',
    color: 'primary',
    items: [
      { label: 'Dashboard', desc: 'KPI cards, charts, recent activity, balances', path: '/dashboard' },
      { label: 'Activity Log', desc: 'Audit trail of all system actions', path: '/activity-log' },
      { label: 'Notifications', desc: 'System alerts and updates', path: '/notifications' },
    ]
  },
  {
    title: 'Bookings (Deals)',
    icon: 'bi-journal-bookmark',
    color: 'success',
    items: [
      { label: 'All Bookings', desc: 'List with filters, bulk delete, colored rows, CSV export', path: '/bookings' },
      { label: 'New Booking', desc: 'Multi-service with flight, hotel, transport, visa, insurance', path: '/bookings/create' },
    ]
  },
  {
    title: 'Customers',
    icon: 'bi-people',
    color: 'info',
    items: [
      { label: 'All Customers', desc: 'Customer list with search', path: '/customers' },
      { label: 'New Customer', desc: 'Add customer with contact details', path: '/customers/create' },
    ]
  },
  {
    title: 'Suppliers',
    icon: 'bi-building',
    color: 'warning',
    items: [
      { label: 'All Suppliers', desc: 'Supplier list by type', path: '/suppliers' },
      { label: 'New Supplier', desc: 'Add airline, hotel, visa provider, etc', path: '/suppliers/create' },
    ]
  },
  {
    title: 'Financials',
    icon: 'bi-cash-stack',
    color: 'danger',
    items: [
      { label: 'Payments', desc: 'Customer payment records', path: '/payments' },
      { label: 'Supplier Payments', desc: 'Supplier payment records', path: '/supplier-payments' },
      { label: 'Invoices', desc: 'Customer & supplier invoices', path: '/invoices' },
      { label: 'Expenses', desc: 'Business expense tracking', path: '/expenses' },
      { label: 'Commissions', desc: 'Agent commission tracking', path: '/commissions' },
    ]
  },
  {
    title: 'Operations',
    icon: 'bi-gear',
    color: 'secondary',
    items: [
      { label: 'Services Catalog', desc: 'Flight, hotel, insurance, transport, visa services', path: '/services' },
      { label: 'Airlines', desc: 'Airline codes and contact info', path: '/airlines' },
      { label: 'Airports', desc: 'Airport codes and locations', path: '/airports' },
      { label: 'Flights', desc: 'Flight schedules management', path: '/flights' },
      { label: 'Hotels', desc: 'Hotel room types and pricing', path: '/hotels' },
      { label: 'Insurance', desc: 'Insurance policies', path: '/insurance' },
      { label: 'Packages', desc: 'Tour packages', path: '/packages' },
    ]
  },
  {
    title: 'Business',
    icon: 'bi-briefcase',
    color: 'dark',
    items: [
      { label: 'Quotations', desc: 'Generate and convert quotations', path: '/quotations' },
      { label: 'Contracts', desc: 'Travel contracts', path: '/contracts' },
      { label: 'Communications', desc: 'Client communications log', path: '/communications' },
      { label: 'Currencies', desc: 'Exchange rates management', path: '/currencies' },
    ]
  },
  {
    title: 'System',
    icon: 'bi-shield-lock',
    color: 'dark',
    items: [
      { label: 'Users', desc: 'User management & roles', path: '/users' },
      { label: 'Settings', desc: 'System configuration', path: '/settings' },
      { label: 'Backup', desc: 'Database backup & restore', path: '/backup' },
    ]
  },
];

const features = [
  { icon: 'bi-airplane', title: 'Flight Booking', desc: 'Airlines dropdown, airport codes, departure/arrival times, +1 day, baggage, PNR, ticket number' },
  { icon: 'bi-building', title: 'Hotel Booking', desc: 'Hotel name, room type, meal plan, check-in/out, nights auto-calc' },
  { icon: 'bi-car-front', title: 'Transport Booking', desc: 'Vehicle type, pickup/dropoff locations, date/time' },
  { icon: 'bi-file-earmark-text', title: 'Visa Processing', desc: 'Country, visa type, application/issue/expiry dates, status tracking' },
  { icon: 'bi-shield-check', title: 'Insurance', desc: 'Provider, policy number, coverage dates, coverage type' },
  { icon: 'bi-currency-exchange', title: 'Multi-Currency', desc: 'USD, ILS, EUR, JOD, AED - exchange rates with auto-conversion' },
  { icon: 'bi-printer', title: 'Print / PDF', desc: 'Professional print layout for booking vouchers' },
  { icon: 'bi-copy', title: 'Duplicate Booking', desc: 'Clone entire booking with services and passengers' },
  { icon: 'bi-arrow-repeat', title: 'Status Workflow', desc: 'Pending → Confirmed → Completed / Cancelled with quick dropdown' },
  { icon: 'bi-file-text', title: 'Customer Statement', desc: 'Full financial statement per customer with balance' },
  { icon: 'bi-building', title: 'Supplier Statement', desc: 'Full financial statement per supplier with balance' },
  { icon: 'bi-person-plus', title: 'Quick Add Customer', desc: 'Add customer inline without leaving the booking form' },
  { icon: 'bi-check2-square', title: 'Bulk Operations', desc: 'Select multiple bookings and delete at once' },
  { icon: 'bi-download', title: 'CSV Export', desc: 'Export bookings and customers to CSV' },
  { icon: 'bi-search', title: 'Smart Search', desc: 'Search bookings by number, customer name, date range' },
  { icon: 'bi-graph-up', title: 'Profit Tracking', desc: 'Auto-calculate cost, selling price, and profit per service' },
  { icon: 'bi-palette', title: 'Color-Coded Rows', desc: 'Green=confirmed, Red=cancelled, Blue=completed' },
  { icon: 'bi-funnel', title: 'Quick Filters', desc: 'Status filter chips for instant filtering' },
  { icon: 'bi-bell', title: 'Supplier Payments', desc: 'Track what you owe suppliers separately' },
];

export default function SystemPage() {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">TravelBox System</h5>
        <small className="text-muted">All features and modules</small>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card bg-primary bg-opacity-10 border-primary">
            <div className="card-body text-center py-4">
              <h4 className="mb-1">Travel Management System</h4>
              <p className="text-muted mb-0">Complete ERP for Travel Agencies — {sections.reduce((s, sec) => s + sec.items.length, 0)} pages, {features.length} features</p>
            </div>
          </div>
        </div>
      </div>

      <h6 className="mb-3"><i className="bi bi-grid me-2"></i>Navigation</h6>
      <div className="row g-3 mb-4">
        {sections.map((sec, i) => (
          <div key={i} className="col-md-6 col-xl-4">
            <div className="card h-100">
              <div className="card-body">
                <h6 className={`text-${sec.color} mb-3`}><i className={`bi ${sec.icon} me-2`}></i>{sec.title}</h6>
                {sec.items.map((item, j) => (
                  <Link key={j} to={item.path} className="d-block text-decoration-none mb-2 p-2 rounded hover-bg">
                    <div className="fw-semibold small">{item.label}</div>
                    <small className="text-muted">{item.desc}</small>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <h6 className="mb-3"><i className="bi bi-stars me-2"></i>Feature Highlights</h6>
      <div className="row g-3">
        {features.map((f, i) => (
          <div key={i} className="col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-body d-flex gap-2">
                <div className="icon bg-primary bg-opacity-10 text-primary flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`bi ${f.icon} fs-5`}></i>
                </div>
                <div>
                  <div className="fw-semibold small">{f.title}</div>
                  <small className="text-muted">{f.desc}</small>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
