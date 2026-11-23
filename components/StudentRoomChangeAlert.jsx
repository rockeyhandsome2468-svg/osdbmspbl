import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { occupancyWS } from '../services/websocket';
import { AlertCircle, ArrowRight, X, Bell } from 'lucide-react';

export default function StudentRoomChangeAlert() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Initial fetch of recent room changes
    api.get('/classes/room-change-history?limit=3')
      .then(res => {
        // Show changes that occurred in last 2 hours
        const recent = res.data.filter(item => {
          const diffMs = new Date() - new Date(item.created_at);
          return diffMs < 2 * 60 * 60 * 1000;
        });
        setAlerts(recent);
      })
      .catch(console.error);

    // Subscribe to live WebSocket events
    const unsubscribe = occupancyWS.subscribe((data) => {
      if (data.event === 'room_changed') {
        const newAlert = {
          change_id: Date.now(),
          original_room_id: data.original_room_id,
          destination_room_id: data.destination_room_id,
          change_reason: data.reason,
          created_at: new Date().toISOString(),
          faculty_name: data.faculty_name
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
      }
    });

    return () => unsubscribe();
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert) => (
        <div 
          key={alert.change_id} 
          className="bg-amber-500/10 border-2 border-amber-500/40 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
              <Bell size={20} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-900 uppercase text-xs tracking-wider bg-amber-200/80 px-2 py-0.5 rounded">
                  Live Classroom Relocation Alert
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800 mt-1">
                Class {alert.faculty_name ? `with ${alert.faculty_name}` : ''} moved to a new classroom!
                <span className="text-xs font-semibold text-slate-600 block mt-0.5">
                  Reason: {alert.change_reason || 'Classroom Relocation'}
                </span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setAlerts(prev => prev.filter(a => a.change_id !== alert.change_id))}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
            title="Dismiss Alert"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

