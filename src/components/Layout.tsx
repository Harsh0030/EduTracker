import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, Users, ClipboardCheck, BarChart3, LogOut, User as UserIcon, Settings, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { COLORS, APP_NAME } from '../constants';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
    { path: '/students', icon: Users, label: 'Students' },
    { path: '/student-details', icon: GraduationCap, label: 'Details' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pl-64">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
            <ClipboardCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">{APP_NAME}</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-red-50 text-red-600 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl mb-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <UserIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{profile?.displayName || 'Teacher'}</p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <ClipboardCheck className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-gray-900">{APP_NAME}</span>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-red-600">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {children}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 ${
                isActive ? 'text-red-600' : 'text-gray-400'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
