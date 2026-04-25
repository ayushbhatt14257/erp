import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login      from './pages/Login';
import Setup      from './pages/Setup';
import Dashboard  from './components/modules/Dashboard';
import StockIn    from './components/modules/StockIn';
import StockOut   from './components/modules/StockOut';
import QuickSearch from './components/modules/QuickSearch';
import OrderCheck from './components/modules/OrderCheck';
import AdminPanel from './components/modules/AdminPanel';
import './index.css';

// access: 'all' | 'worker' | 'admin'
const NAV = [
  { path:'/',        label:'Dashboard',    icon:'◉', access:'all'    },
  { path:'/in',      label:'Stock In',     icon:'↓', access:'worker' },
  { path:'/out',     label:'Stock Out',    icon:'↑', access:'worker' },
  { path:'/search',  label:'Quick Search', icon:'⌕', access:'all'    },
  { path:'/orders',  label:'Order Check',  icon:'✓', access:'worker' },
  { path:'/admin',   label:'Admin',        icon:'⚙', access:'admin'  },
];

function canSee(item, user) {
  if (!user) return false;
  if (item.access === 'all')    return true;
  if (item.access === 'worker') return ['admin','worker'].includes(user.role);
  if (item.access === 'admin')  return user.role === 'admin';
  return false;
}

function Guard({ children, access = 'all' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center text-muted" style={{padding:48}}>Loading...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (access === 'admin'  && user.role !== 'admin')                           return <Navigate to="/"       replace />;
  if (access === 'worker' && !['admin','worker'].includes(user.role))         return <Navigate to="/search" replace />;
  return children;
}

function Shell() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visible = NAV.filter(n => canSee(n, user));

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <>
      <div className="sidebar-logo">
        <h2>📦 Cover ERP</h2>
        <p>Semi-finished inventory</p>
      </div>
      <nav className="sidebar-nav">
        {visible.map(n => (
          <NavLink key={n.path} to={n.path} end={n.path==='/'} onClick={() => setDrawerOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user-name">{user?.displayName}</div>
        <div className="sidebar-user-role">{user?.role}</div>
        <button className="btn btn-outline btn-sm" style={{width:'100%'}} onClick={handleLogout}>Sign out</button>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar"><SidebarContent /></aside>

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setDrawerOpen(o => !o)} aria-label="Menu">☰</button>
        <h2>📦 Cover ERP</h2>
        <div style={{width:40}} />
      </div>

      {/* Mobile drawer overlay */}
      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />

      {/* Mobile sidebar drawer */}
      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`} style={{zIndex:51}}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Routes>
          <Route path="/"       element={<Guard access="all">   <Dashboard />  </Guard>} />
          <Route path="/in"     element={<Guard access="worker"><StockIn />    </Guard>} />
          <Route path="/out"    element={<Guard access="worker"><StockOut />   </Guard>} />
          <Route path="/search" element={<Guard access="all">   <QuickSearch /></Guard>} />
          <Route path="/orders" element={<Guard access="worker"><OrderCheck /> </Guard>} />
          <Route path="/admin"  element={<Guard access="admin"> <AdminPanel /> </Guard>} />
          <Route path="*"       element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Mobile bottom nav — max 5 items */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {visible.slice(0, 5).map(n => (
            <button key={n.path} className={`mobile-nav-item ${location.pathname === n.path ? 'active' : ''}`}
              onClick={() => navigate(n.path)}>
              <span className="mobile-nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function RootGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center text-muted" style={{padding:48}}>Loading...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{
          duration: 3500,
          style: { fontSize: 14, maxWidth: 380 },
          success: { iconTheme: { primary:'#057a55', secondary:'#fff' } },
          error:   { iconTheme: { primary:'#c81e1e', secondary:'#fff' } },
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/*"     element={<RootGuard><Shell /></RootGuard>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
