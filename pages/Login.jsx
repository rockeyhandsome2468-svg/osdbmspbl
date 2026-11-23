import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@campus.edu');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center -mt-8">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,100,200,0.15)] border border-white overflow-hidden">
        
        {/* Left Side: Branding / Info */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-brand-navy to-[#0f3b61] p-12 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-brand-teal/20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="bg-brand-teal p-2.5 rounded-xl">
                <LayoutDashboard size={28} className="text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">SmartCampus</span>
            </div>
            
            <h1 className="text-4xl font-extrabold mb-6 leading-tight">Intelligent Space <br/><span className="text-brand-teal">Management</span></h1>
            <p className="text-blue-100 text-lg mb-8 leading-relaxed max-w-sm">
              Experience the next generation of campus resource allocation. Best-fit algorithms, real-time analytics, and seamless scheduling.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-blue-50"><CheckCircle2 className="text-brand-teal" size={20}/> Priority-based conflict resolution</li>
              <li className="flex items-center gap-3 text-blue-50"><CheckCircle2 className="text-brand-teal" size={20}/> Best-Fit spatial matching</li>
              <li className="flex items-center gap-3 text-blue-50"><CheckCircle2 className="text-brand-teal" size={20}/> Live utilization analytics</li>
            </ul>
          </div>
          
          <div className="relative z-10 mt-12 text-sm text-blue-200/60 font-medium">
            &copy; {new Date().getFullYear()} SmartCampus Platform. All rights reserved.
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="bg-brand-navy p-2 rounded-lg">
              <LayoutDashboard size={24} className="text-brand-teal" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">SmartCampus</span>
          </div>

          <h2 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Welcome back</h2>
          <p className="text-slate-500 mb-10 text-lg font-medium">Please enter your credentials to access your workspace.</p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-semibold flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div> {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-brand-teal/20 focus:border-brand-teal transition-all font-semibold text-slate-900 shadow-sm hover:border-slate-300" 
                  placeholder="admin@campus.edu"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-brand-teal/20 focus:border-brand-teal transition-all font-semibold text-slate-900 shadow-sm hover:border-slate-300" 
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-brand-navy hover:bg-[#0a1f33] text-white py-4 rounded-xl font-black tracking-wide flex justify-center items-center gap-2 transition-all shadow-md hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? 'AUTHENTICATING...' : 'SIGN IN SECURELY'}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>
          
          <div className="mt-10 bg-slate-100/80 rounded-xl p-5 border border-slate-200 shadow-inner">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="block font-bold text-slate-900">Admin</span>
                <span className="text-slate-500 text-xs select-all">admin@campus.edu</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="block font-bold text-slate-900">Faculty</span>
                <span className="text-slate-500 text-xs select-all">smith@campus.edu</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm col-span-2">
                <span className="block font-bold text-slate-900">Student</span>
                <span className="text-slate-500 text-xs select-all">jane@campus.edu</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">Passwords for all roles: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono">role123</code> (e.g., admin123)</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}

