import { Link } from 'react-router-dom';

const modules = [
  {
    title: 'Dashboard',
    icon: 'bi-speedometer2',
    color: 'primary',
    path: '/',
    features: [
      { feature: 'KPI Cards', desc: 'Bookings, Customers, Today, Pending counts with animated counters' },
      { feature: 'Balance Cards', desc: 'Receivables, Payables, Monthly Profit in ILS' },
      { feature: 'Upcoming Departures', desc: 'Widget showing confirmed bookings with travel dates ahead + WhatsApp reminder button per booking' },
      { feature: 'Overdue Payments', desc: 'Widget showing bookings past travel date with unpaid balance' },
      { feature: 'Bar Chart', desc: 'Monthly bookings chart (12 months)' },
      { feature: 'Pie Chart', desc: 'Booking status breakdown (Confirmed/Pending/Cancelled/Completed)' },
      { feature: 'Recent Payments', desc: 'Last 5 customer payments and supplier payments' },
      { feature: 'Recent Bookings Table', desc: 'Last 10 bookings with links' },
    ],
  },
  {
    title: 'Booking (Deal)',
    icon: 'bi-journal-bookmark',
    color: 'success',
    path: '/bookings',
    features: [
      { feature: 'Create Booking', desc: 'Multi-step form: Customer → Passengers → Services → Notes' },
      { feature: 'Customer Search', desc: 'Type-to-search with autocomplete dropdown showing name, phone, email' },
      { feature: 'Quick Add Customer', desc: '+ button opens modal to add customer inline without leaving the form' },
      { feature: 'Date of Birth', desc: 'Passenger DOB field — auto-calculates type (Infant < 2, Child < 12, Adult)' },
      { feature: 'Passenger Fields', desc: 'Name, Date of Birth, Passport #, Nationality per passenger' },
      { feature: 'Flight Service', desc: 'Airline dropdown (200+), Origin/Destination airport dropdowns (250+), Flight #, Ticket #, PNR, Departure Date/Time +1, Arrival Date/Time +1, Checked Baggage (kg), Cabin Baggage (kg), Booking Class' },
      { feature: 'Hotel Service', desc: 'Hotel name, Room type, Board basis (Room Only→All Inclusive), Check-in/out dates' },
      { feature: 'Transport Service', desc: 'Vehicle type (Car/Bus/Van/Limo), Pickup/Dropoff locations, Pickup time' },
      { feature: 'Visa Service', desc: 'Country, Visa type (Tourist/Business/Transit/Student/Work), Application date, Expiry date' },
      { feature: 'Insurance Service', desc: 'Provider name, Policy #, Coverage start/end dates' },
      { feature: 'Other Service', desc: 'Free-text description for any custom service' },
      { feature: 'Supplier Dropdown', desc: 'Supplier field uses dropdown from suppliers list instead of free text' },
      { feature: 'Currency Selector', desc: 'ILS (base) + USD + EUR + JOD + AED per service' },
      { feature: 'Auto Totals Bar', desc: 'Total Cost, Total Price, Profit calculated and displayed in real-time' },
      { feature: 'Edit Booking', desc: 'Full editing of customer, status, passengers, and all services' },
      { feature: 'Duplicate Booking', desc: 'Clone entire booking with all passengers and services as new pending booking' },
      { feature: 'Status Change', desc: 'Dropdown on booking detail page: Pending/Confirmed/Completed/Cancelled' },
      { feature: 'Bulk Delete', desc: 'Checkboxes on bookings list — select multiple and delete all at once' },
      { feature: 'Colored Rows', desc: 'Green for confirmed, red for cancelled, blue for completed' },
      { feature: 'Date Filter', desc: 'From/To date inputs to filter bookings by travel date range' },
      { feature: 'Quick Filter Chips', desc: 'All/Pending/Confirmed/Completed/Cancelled buttons above table' },
      { feature: 'Service Count', desc: 'Column showing number of services in each booking' },
      { feature: 'CSV Export', desc: 'Download bookings as CSV file' },
      { feature: 'Print / PDF', desc: 'Clean print layout with all booking details for vouchers' },
    ],
  },
  {
    title: 'Communication',
    icon: 'bi-chat-dots',
    color: 'teal',
    features: [
      { feature: 'WhatsApp Booking', desc: 'Send full booking summary via WhatsApp to customer — includes booking #, dates, route, services list, total amount' },
      { feature: 'WhatsApp Reminder', desc: 'Send pre-departure reminder via WhatsApp with travel details' },
      { feature: 'WhatsApp Customer', desc: 'WhatsApp button on customer detail page' },
      { feature: 'Email Booking', desc: 'Open email client pre-filled with booking details for customer' },
      { feature: 'Call Log', desc: 'Record calls with customers — date, notes, follow-up date' },
      { feature: 'Follow-ups Today', desc: 'Highlighted section showing calls due for follow-up today' },
    ],
  },
  {
    title: 'Customers',
    icon: 'bi-people',
    color: 'info',
    path: '/customers',
    features: [
      { feature: 'Customer List', desc: 'Searchable table with name, phone, email' },
      { feature: 'Customer Detail', desc: 'Info card + bookings table for the customer' },
      { feature: 'Customer Statement', desc: 'Full financial statement: total bookings, total paid, balance, per-booking detail, payment history' },
      { feature: 'WhatsApp Button', desc: 'Quick WhatsApp message to customer' },
    ],
  },
  {
    title: 'Suppliers',
    icon: 'bi-building',
    color: 'warning',
    path: '/suppliers',
    features: [
      { feature: 'Supplier List', desc: 'Search + type filter chips (Airline, Hotel, Visa, etc.)' },
      { feature: 'Multi-Type', desc: 'Checkboxes — a supplier can be Airline + Tour Provider simultaneously' },
      { feature: 'Type Badges', desc: 'Colored badges with icons for each supplier type' },
      { feature: 'Supplier Statement', desc: 'Financial statement with total cost, payments, and balance' },
      { feature: 'Supplier Payments', desc: 'Record payments made to suppliers with currency support' },
    ],
  },
  {
    title: 'Financial',
    icon: 'bi-cash-stack',
    color: 'danger',
    features: [
      { feature: 'Customer Payments', desc: 'Record payments from customers — cash, credit card, bank transfer, cheque' },
      { feature: 'Supplier Payments', desc: 'Record payments to suppliers with currency tracking' },
      { feature: 'Exchange Rates', desc: 'ILS base + USD, EUR, JOD, AED, THB, EGP, GBP — auto-seeded on startup' },
      { feature: 'Multi-Currency', desc: 'Every service has currency selector — rates auto-convert to ILS' },
      { feature: 'Auto-Profit', desc: 'Profit = Selling Price - Cost Price, calculated per service and per booking' },
      { feature: 'Invoices', desc: 'Generate and manage customer invoices' },
      { feature: 'Expenses', desc: 'Track business expenses by category' },
      { feature: 'Commissions', desc: 'Agent commission tracking' },
    ],
  },
  {
    title: 'Operations',
    icon: 'bi-gear',
    color: 'secondary',
    features: [
      { feature: 'Airlines Database', desc: '200+ airlines with code, name, country — auto-seeded on startup' },
      { feature: 'Airports Database', desc: '250+ airports with code, name, city, country — auto-seeded on startup' },
      { feature: 'Flight Schedules', desc: 'Manage flight schedules' },
      { feature: 'Hotels Management', desc: 'Hotel database with room types and pricing' },
      { feature: 'Insurance Policies', desc: 'Insurance policy management' },
      { feature: 'Tour Packages', desc: 'Package tours management' },
      { feature: 'Services Catalog', desc: 'Master catalog of all service types with pricing' },
    ],
  },
  {
    title: 'AI Tools',
    icon: 'bi-magic',
    color: 'purple',
    path: '/ai-reader',
    features: [
      { feature: 'PDF Upload', desc: 'Upload airline tickets, hotel vouchers, visa documents (PDF, JPG, PNG)' },
      { feature: 'Auto-Detect', desc: 'Automatically detects document type (flight/hotel/visa)' },
      { feature: 'Flight Extraction', desc: 'Passenger name, airline, flight #, PNR, ticket #, origin, destination, dates, times' },
      { feature: 'Hotel Extraction', desc: 'Hotel name, guest name, room type, check-in/out, city, confirmation #' },
      { feature: 'Visa Extraction', desc: 'Passport name, visa #, country, type, issue/expiry dates' },
      { feature: 'Confidence Score', desc: '0-100% match confidence indicator per extraction' },
      { feature: 'Editable Fields', desc: 'Edit extracted fields before creating records' },
      { feature: 'Manual Mode', desc: 'Type data manually without uploading a file' },
      { feature: 'Auto-Create', desc: 'One-click creation of full booking from extracted data' },
      { feature: 'Raw Text Preview', desc: 'Expandable raw text view for debugging extraction' },
    ],
  },
  {
    title: 'Search & Reports',
    icon: 'bi-search',
    color: 'dark',
    features: [
      { feature: 'Global Search', desc: 'Single search box queries bookings, customers, and suppliers simultaneously' },
      { feature: 'Reports Page', desc: 'Financial summary, monthly breakdown, revenue/profit/margin stats' },
      { feature: 'System Page', desc: 'Full sitemap and feature catalog (this page)' },
    ],
  },
  {
    title: 'Documents',
    icon: 'bi-paperclip',
    color: 'secondary',
    features: [
      { feature: 'Booking Attachments', desc: 'Upload PDF, images, documents to any booking' },
      { feature: 'File Types', desc: 'Supports PDF, JPG, PNG, DOCX up to 20MB' },
      { feature: 'File Icons', desc: 'Visual icons for PDF (red), images (blue), other files' },
      { feature: 'Delete Attachment', desc: 'Remove uploaded documents from bookings' },
    ],
  },
  {
    title: 'System',
    icon: 'bi-shield-lock',
    color: 'dark',
    features: [
      { feature: 'User Management', desc: 'Admin, Manager, Sales, Accountant, Support roles' },
      { feature: 'JWT Authentication', desc: 'Token-based auth with auto-logout on expiry' },
      { feature: 'Settings', desc: 'System configuration — company info, currency, prefixes' },
      { feature: 'Backup & Restore', desc: 'Database backup and restore with SQL injection protection' },
      { feature: 'Activity Log', desc: 'Full audit trail of all system actions' },
      { feature: 'Notifications', desc: 'In-app notification system' },
      { feature: 'SQL Injection Safe', desc: 'All 73 route files audited — parameterized queries throughout' },
      { feature: 'Auto-Seed', desc: 'Airports, airlines, exchange rates auto-populated on first run' },
    ],
  },
];

const colors = {
  primary: '#4361ee', success: '#22c55e', info: '#0ea5e9', warning: '#f59e0b',
  danger: '#ef4444', secondary: '#64748b', dark: '#1e293b', teal: '#14b8a6', purple: '#8b5cf6',
};

export default function SystemPage() {
  const totalFeatures = modules.reduce((s, m) => s + m.features.length, 0);
  return (
    <div>
      <div className="text-center mb-4">
        <h4 className="fw-bold">TravelBox — Feature Catalog</h4>
        <p className="text-muted mb-0">{modules.length} modules · {totalFeatures} features · v2.0</p>
      </div>

      <div className="row g-3">
        {modules.map((mod, i) => (
          <div key={i} className="col-lg-6">
            <div className="card h-100 border-top border-3" style={{ borderTopColor: colors[mod.color] || colors.primary }}>
              <div className="card-body">
                <h6 className="d-flex align-items-center gap-2 mb-3" style={{ color: colors[mod.color] }}>
                  <i className={`bi ${mod.icon} fs-5`}></i>
                  {mod.path ? <Link to={mod.path} className="text-decoration-none stretched-link-after" style={{ color: colors[mod.color] }}>{mod.title}</Link> : mod.title}
                  <span className="badge bg-light text-muted ms-auto">{mod.features.length}</span>
                </h6>
                <div className="row g-2">
                  {mod.features.map((f, j) => (
                    <div key={j} className="col-12">
                      <div className="d-flex gap-2">
                        <span className="text-muted mt-1" style={{ fontSize: '0.5rem' }}>●</span>
                        <div>
                          <span className="fw-semibold small">{f.feature}</span>
                          <br />
                          <small className="text-muted">{f.desc}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
