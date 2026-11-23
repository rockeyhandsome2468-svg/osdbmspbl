import React, { useEffect, useState, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, CalendarCheck, Settings, Activity, Info, Layers, CheckCircle2 } from 'lucide-react';
import FacultyClassPanel from '../components/FacultyClassPanel';
import StudentRoomChangeAlert from '../components/StudentRoomChangeAlert';
import LiveRoomStatusGrid from '../components/LiveRoomStatusGrid';

const COLORS = ['#0A2540', '#00D4FF', '#4ade80', '#fbbf24', '#f87171'];

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [chartTab, setChartTab] = useState('occupancy'); // 'occupancy' or 'room_types'

  const fetchDashboardStats = () => {
    api.get('/analytics/dashboard')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [refreshKey]);

  const handleStatusChanged = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Activity className="animate-spin text-brand-teal" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Student Room Relocation Notification Banner */}
      {user?.role === 'student' && <StudentRoomChangeAlert />}

      {/* Faculty Dedicated "My Current Class" Panel */}
      {(user?.role === 'faculty' || user?.role === 'admin') && (
        <FacultyClassPanel onStatusChanged={handleStatusChanged} />
      )}

      {/* Main Header & Stat Cards */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Campus Overview & Telemetry</h1>
            <p className="text-sm text-slate-500 mt-1">Live campus monitoring and automated resource allocation metrics.</p>
          </div>
          <p className="text-slate-500 text-xs font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            <Activity size={14} className="text-emerald-500 animate-pulse" /> Live Telemetry
          </p>
        </div>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card flex items-center p-6 border-l-4 border-brand-teal bg-gradient-to-r from-white to-slate-50 relative overflow-hidden">
            <div className="p-4 rounded-full bg-teal-50 text-brand-teal mr-5 relative z-10">
              <Building2 size={28} />
            </div>
            <div className="relative z-10">
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Total Rooms</p>
              <p className="text-3xl font-bold text-slate-800">{data.stats.total_rooms}</p>
            </div>
            <Building2 size={120} className="absolute -right-6 -bottom-6 text-slate-100 opacity-50 pointer-events-none" />
          </div>
          
          <div className="card flex items-center p-6 border-l-4 border-brand-navy bg-gradient-to-r from-white to-slate-50 relative overflow-hidden">
            <div className="p-4 rounded-full bg-blue-50 text-slate-800 mr-5 relative z-10">
              <CalendarCheck size={28} />
            </div>
            <div className="relative z-10">
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Active Bookings</p>
              <p className="text-3xl font-bold text-slate-800">{data.stats.total_bookings}</p>
            </div>
            <CalendarCheck size={120} className="absolute -right-6 -bottom-6 text-slate-100 opacity-50 pointer-events-none" />
          </div>
          
          <div className="card flex items-center p-6 border-l-4 border-amber-500 bg-gradient-to-r from-white to-slate-50 relative overflow-hidden">
            <div className="p-4 rounded-full bg-amber-50 text-amber-600 mr-5 relative z-10">
              <Settings size={28} />
            </div>
            <div className="relative z-10">
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">In Maintenance</p>
              <p className="text-3xl font-bold text-slate-800">{data.stats.active_maintenance}</p>
            </div>
            <Settings size={120} className="absolute -right-6 -bottom-6 text-slate-100 opacity-50 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Section - Placed ABOVE the Check-In / Out Room Grid for ALL users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Card 1: Live Occupancy & Check-In Telemetry / Room Types */}
        <div className="card h-[440px] flex flex-col bg-white shadow-md border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-emerald-500 animate-pulse" />
                {chartTab === 'occupancy' ? 'Live Check-In & Occupancy Telemetry' : 'Room Types & Seating Distribution'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {chartTab === 'occupancy' ? 'Real-time physical check-in status across all campus rooms' : 'Distribution of learning spaces by category'}
              </p>
            </div>
            
            {/* View Switcher Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
              <button
                onClick={() => setChartTab('occupancy')}
                className={`px-3 py-1.5 rounded-lg transition-all ${chartTab === 'occupancy' ? 'bg-brand-navy text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Live Occupancy
              </button>
              <button
                onClick={() => setChartTab('room_types')}
                className={`px-3 py-1.5 rounded-lg transition-all ${chartTab === 'room_types' ? 'bg-brand-navy text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Room Types
              </button>
            </div>
          </div>
          
          {chartTab === 'occupancy' ? (
            <div className="flex-grow flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2 h-[220px] sm:h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.live_status_breakdown || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {(data.charts.live_status_breakdown || []).map((entry, index) => (
                        <Cell key={`status-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-200 text-xs">
                              <p className="font-extrabold text-slate-800 mb-1 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                                {d.name}
                              </p>
                              <div className="space-y-1 mt-1 font-medium">
                                <p className="text-slate-600">Total: <strong className="text-slate-900">{d.value} rooms</strong></p>
                                <p className="text-slate-600">Share: <strong className="text-brand-teal">{d.percentage}%</strong></p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 flex flex-col justify-center gap-1.5 overflow-y-auto max-h-[260px] pr-1">
                {(data.charts.live_status_breakdown || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></span>
                      <span className="font-bold text-slate-800">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900">{item.value}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col sm:flex-row items-center">
              <div className="w-full sm:w-1/2 h-[220px] sm:h-full -mt-4 sm:mt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.room_types}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {data.charts.room_types.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-200 text-sm">
                              <p className="font-bold text-slate-800 mb-1 border-b border-slate-100 pb-1">{d.name}</p>
                              <div className="space-y-1 mt-2">
                                <p className="text-slate-600 flex justify-between gap-4"><span className="font-medium text-slate-500">Total Rooms:</span> {d.value}</p>
                                <p className="text-brand-teal font-semibold flex justify-between gap-4"><span>Total Seats:</span> {d.capacity}</p>
                                <p className="text-blue-400 font-medium flex justify-between gap-4"><span>Avg Capacity:</span> {d.avg_capacity || 0}</p>
                                <p className="text-slate-600 flex justify-between gap-4"><span className="font-medium text-slate-500">Proportion:</span> {d.percentage || 0}%</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-full sm:w-1/2 pl-0 sm:pl-2 flex flex-col justify-center gap-2 overflow-y-auto pr-1 pb-2 max-h-[250px] sm:max-h-[300px]">
                {data.charts.room_types.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:shadow-md transition-all hover:border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{entry.name}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{entry.percentage || 0}% of campus</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-800">{entry.value} <span className="text-xs font-medium text-slate-500 uppercase">rooms</span></div>
                      <div className="text-xs text-brand-teal font-bold">{entry.capacity} SEATS</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Bookings per Building */}
        <div className="card h-[440px] flex flex-col bg-white shadow-md border border-slate-100">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Bookings per Building</h2>
              <p className="text-xs text-slate-500 mt-0.5">Segmented by user role priority</p>
            </div>
            <div className="text-brand-teal bg-teal-50 p-1.5 rounded-full" title="Compares the volume of bookings made by Faculty/Admin vs Students in each building"><Info size={16}/></div>
          </div>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.building_bookings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} allowDecimals={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="Faculty/Admin" name="Faculty & Admin" stackId="a" fill="#0A2540" radius={[0, 0, 4, 4]} maxBarSize={50} />
                <Bar dataKey="Students" name="Students & Clubs" stackId="a" fill="#00D4FF" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real-Time Live Classroom Status Grid (The Check-In / Out Room Grid) */}
      <LiveRoomStatusGrid refreshTrigger={refreshKey} />
    </div>
  );
}
