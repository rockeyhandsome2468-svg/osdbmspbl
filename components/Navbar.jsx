import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Search, User, Menu, ShieldAlert, Calendar, AlertTriangle } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-brand-navy text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-brand-teal p-2 rounded-lg group-hover:bg-white transition-colors">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-white group-hover:text-brand-teal transition-colors">SmartCampus</span>
            </Link>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${isActive('/') ? 'bg-white/10 text-brand-teal' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}
            >
              <LayoutDashboard size={18} /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link 
              to="/schedule" 
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${isActive('/schedule') ? 'bg-white/10 text-brand-teal' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}
            >
              <Calendar size={18} /> <span className="hidden sm:inline">Room Schedule</span>
            </Link>
            <Link 
              to="/search" 
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${isActive('/search') ? 'bg-white/10 text-brand-teal' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}
            >
              <Search size={18} /> <span className="hidden sm:inline">Book Space</span>
            </Link>

            {(user.role === 'admin' || user.role === 'faculty') && (
              <Link 
                to="/admin" 
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${isActive('/admin') ? 'bg-white/10 text-red-400' : 'text-blue-100/70 hover:bg-white/10 hover:text-red-300'}`}
              >
                <ShieldAlert size={18} /> <span className="hidden sm:inline">{user.role === 'admin' ? 'Admin Panel' : 'Manage Bookings'}</span>
              </Link>
            )}
            
            <div className="flex items-center gap-3 ml-2 sm:ml-6 pl-2 sm:pl-6 border-l border-white/10">
              {user.strikes_count > 0 && (
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm ${
                  user.is_suspended 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'bg-amber-400 text-slate-900'
                }`} title={user.is_suspended ? 'Booking privileges suspended' : `${user.strikes_count} no-show strikes accumulated`}>
                  <AlertTriangle size={12} /> {user.strikes_count}/3 Strikes
                </span>
              )}

              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold leading-tight">{user.name}</span>
                <span className="text-xs text-brand-teal uppercase tracking-wider font-semibold">{user.role}</span>
              </div>
              <div className="bg-white/10 p-2 rounded-full hidden sm:block">
                <User size={18} className="text-white" />
              </div>
              <button 
                onClick={handleLogout} 
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-md transition-all flex items-center gap-2 text-sm font-semibold"
                title="Logout"
              >
                <LogOut size={18} /> <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}
