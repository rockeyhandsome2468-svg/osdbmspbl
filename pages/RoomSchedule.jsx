import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Calendar, Clock, AlertCircle, Filter } from 'lucide-react';

export default function RoomSchedule() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  
  // New Filter States
  const [filterType, setFilterType] = useState('');
  const [filterCapacity, setFilterCapacity] = useState('');

  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/classrooms/');
        setRooms(res.data);
      } catch (err) {
        console.error("Error fetching rooms", err);
      }
    };
    fetchRooms();
  }, []);

  // Fetch schedule when a room is selected
  useEffect(() => {
    if (!selectedRoom) {
      setSchedule([]);
      return;
    }

    const fetchSchedule = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/classrooms/${selectedRoom}/schedule`);
        setSchedule(res.data);
      } catch (err) {
        setError('Failed to fetch schedule for this room.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchedule();
  }, [selectedRoom]);

  // Format date/time
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  // Derive filtered rooms
  const filteredRooms = rooms.filter(r => {
    if (filterType && r.room_type !== filterType) return false;
    if (filterCapacity && r.capacity < parseInt(filterCapacity)) return false;
    return true;
  });

  const uniqueTypes = [...new Set(rooms.map(r => r.room_type).filter(Boolean))];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Room Schedule & Availability</h1>
        <p className="text-slate-500">Check future bookings and availability for any classroom.</p>
      </div>

      <div className="card mb-8 bg-white shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-lg">
          <Filter size={20} /> Search & Filter Rooms
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Room Type</label>
            <select 
              className="input-field w-full"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setSelectedRoom('');
              }}
            >
              <option value="">All Types</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Min Capacity</label>
            <input 
              type="number" 
              className="input-field w-full" 
              placeholder="e.g. 50"
              value={filterCapacity}
              onChange={(e) => {
                setFilterCapacity(e.target.value);
                setSelectedRoom('');
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Select a Room</label>
            <select 
              className="input-field w-full" 
              value={selectedRoom} 
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              <option value="">-- Choose a Room --</option>
              {filteredRooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  Room {r.room_number} ({r.room_type || 'General'} - {r.capacity} seats)
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {filteredRooms.length === 0 && (
          <div className="mt-4 text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
            No rooms match your filter criteria. Try clearing them.
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-10 text-slate-500">
          <Clock className="animate-spin mx-auto mb-2" size={32} />
          <p>Loading schedule...</p>
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {!loading && selectedRoom && schedule.length === 0 && (
        <div className="text-slate-500 text-center py-16 bg-white rounded-xl shadow-sm border border-slate-100 border-dashed">
          <Calendar size={48} className="mx-auto mb-4 text-emerald-400" />
          <p className="text-lg font-medium text-slate-800">Room is completely empty!</p>
          <p className="text-sm mt-1 mb-6">There are no future bookings or maintenance scheduled.</p>
          <Link to="/search" className="btn-primary px-6 py-2 rounded-full font-semibold inline-flex items-center gap-2 transition-transform hover:scale-105">
            Book this Space
          </Link>
        </div>
      )}

      {!loading && schedule.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Upcoming Events</h2>
          {schedule.map((event, idx) => (
            <div key={idx} className={`p-5 rounded-lg border-l-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              event.type === 'maintenance' 
                ? 'bg-amber-50 border-amber-500' 
                : 'bg-white border-brand-teal'
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    event.type === 'maintenance' ? 'bg-amber-200 text-amber-800' : 'bg-brand-teal/20 text-brand-teal'
                  }`}>
                    {event.type}
                  </span>
                  <h3 className="font-bold text-slate-800 text-lg">{event.purpose}</h3>
                </div>
                <div className="text-slate-600 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2">
                  <span className="flex items-center gap-1"><Clock size={14} /> Start: {formatDateTime(event.start_time)}</span>
                  <span className="hidden sm:inline text-slate-600">|</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> End: {formatDateTime(event.end_time)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

