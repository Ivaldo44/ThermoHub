/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Thermometer, Database, History, Settings, Menu, X, Users, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import EquipmentManager from './components/EquipmentManager';
import TemperatureLogger from './components/TemperatureLogger';
import LogHistory from './components/LogHistory';
import SettingsPage from './components/SettingsPage';
import UserManager from './components/UserManager';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile } from './types';

function Sidebar({ isOpen, onClose, user, profile }: { isOpen: boolean; onClose: () => void; user: User | null; profile: UserProfile | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Thermometer, label: 'Novo Registro', path: '/log' },
    { icon: History, label: 'Histórico', path: '/history' },
    { icon: Database, label: 'Equipamentos', path: '/equipment' },
    { icon: Users, label: 'Equipe', path: '/users' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 text-zinc-100 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full border-r border-zinc-800">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">ThermoHub</span>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path 
                    ? "bg-zinc-800 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          
          <div className="p-4 border-t border-zinc-800 space-y-2">
            <Link to="/profile" onClick={() => onClose()} className="block">
              <div className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-900 rounded-md transition-colors group">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile?.full_name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-zinc-300 font-medium truncate group-hover:text-white transition-colors">
                    {profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400">
                    {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'operator' ? 'Operador' : 'Visualizador'}
                  </span>
                </div>
              </div>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-3 text-zinc-400 hover:text-red-400 hover:bg-red-950/30"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function MainLayout({ user, profile, unitName, isSidebarOpen, setIsSidebarOpen }: { user: any, profile: UserProfile | null, unitName: string, isSidebarOpen: boolean, setIsSidebarOpen: (open: boolean) => void }) {
  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={user} profile={profile} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-zinc-800">{unitName}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Sistema Online
            </div>
            {profile?.role === 'admin' && (
              <Link to="/settings">
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Configurações</span>
                </Button>
              </Link>
            )}
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="log" element={<TemperatureLogger />} />
              <Route path="history" element={<LogHistory />} />
              <Route path="equipment" element={<EquipmentManager />} />
              <Route path="users" element={<UserManager />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              {/* Fallback for sub-routes */}
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unitName, setUnitName] = useState('Controle de Temperatura');
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (data) setProfile(data);
        setLoading(false);
      };
      fetchProfile();
    }
  }, [session]);

  useEffect(() => {
    const fetchUnitName = async () => {
      const { data } = await supabase.from('system_settings').select('unit_name').eq('id', 1).single();
      if (data?.unit_name) {
        setUnitName(data.unit_name);
      }
    };
    fetchUnitName();

    const channel = supabase
      .channel('system_settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings' }, (payload) => {
        if (payload.new.unit_name) {
          setUnitName(payload.new.unit_name);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-zinc-500">Carregando ThermoHub...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            session ? (
              <MainLayout 
                user={session.user} 
                profile={profile}
                unitName={unitName} 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
              />
            ) : (
              <LoginPage />
            )
          }
        />
      </Routes>
    </Router>
  );
}

