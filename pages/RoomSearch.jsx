import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { Calendar, Users, Settings, Search, CheckCircle, Clock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function RoomSearch() {
  const { user } = useContext(AuthContext);
  const [attendeeCount, setAttendeeCount] = useState(30);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');

  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/users/faculty')
        .then(res => {
          setFacultyList(res.data);
          if (res.data.length > 0) setSelectedFaculty(res.data[0].user_id);
        })
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    tmr.setHours(10, 0, 0, 0);
    const tmrEnd = new Date(tmr);
    tmrEnd.setHours(11, 0, 0, 0);

    const pad = (n) => n.toString().padStart(2, '0');
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setStartTime(format(tmr));
    setEndTime(format(tmrEnd));
  }, []);

  const handleSearch = async (e) => {
    if(e) e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const payload = {
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        attendee_count: parseInt(attendeeCount),
        facilities: []
      };
      const res = await api.post('/allocations/best-fit', payload);
      setRooms(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error finding rooms');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (roomId) => {
    try {
      const payload = {
        room_id: roomId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        attendee_count: parseInt(attendeeCount),
        purpose: "General Booking"
      };
      
      if (user?.role === 'student' && selectedFaculty) {
        payload.approver_id = parseInt(selectedFaculty);
      }
      
      await api.post('/bookings/', payload);
      if (user?.role === 'student') {
        alert('Booking request submitted to Faculty/Admin for approval! 🎉');
      } else {
        alert('Booking successful! 🎉');
      }
      handleSearch();
    } catch (err) {
      alert(err.response?.data?.detail || 'Booking failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Find & Book a Room</h1>
        <p className="text-slate-500">Smart Best-Fit allocation will recommend the optimal space for your needs.</p>
      </div>
      
      <div className="card mb-10 bg-gradient-to-br from-white to-slate-50 shadow-md">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2"><Clock size={16}/> Start Time</label>
            <input type="datetime-local" className="input-field" value={startTime} onChange={e => setStartTime(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2"><Clock size={16}/> End Time</label>
            <input type="datetime-local" className="input-field" value={endTime} onChange={e => setEndTime(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2"><Users size={16}/> Expected Attendees</label>
            <input type="number" min="1" className="input-field" value={attendeeCount} onChange={e => setAttendeeCount(e.target.value)} required />
          </div>
          <div>
            <button type="submit" className="w-full btn-secondary h-[46px] flex items-center justify-center gap-2 text-lg" disabled={loading}>
              <Search size={20} /> {loading ? 'Searching...' : 'Find Rooms'}
            </button>
          </div>
        </form>
        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-center gap-2"><Settings size={16}/> {error}</div>}
      </div>

      {searched && (
        <div className="mb-6 flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-800">Recommended Results</h2>
          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-xs font-bold">{rooms.length} found</span>
        </div>
      )}
      
      {rooms.length === 0 && !loading && searched && (
        <div className="text-slate-500 text-center py-16 bg-white rounded-xl shadow-sm border border-slate-100 border-dashed">
          <Settings size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-lg font-medium text-slate-800">No rooms available matching your criteria.</p>
          <p className="text-sm mt-1">Try adjusting the time or attendee count.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {rooms.map((room, index) => (
          <div key={room.room_id} className="card relative flex flex-col group hover:-translate-y-1 transition-transform duration-300">
            {index === 0 && (
              <div className="absolute -top-3 -right-3 bg-brand-teal text-white shadow-lg text-xs font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1 border-2 border-white">
                <CheckCircle size={14} /> TOP MATCH
              </div>
            )}
            
            <div className="border-b border-slate-100 pb-4 mb-4">
              <span className="text-xs font-bold text-brand-teal uppercase tracking-wider mb-1 block">Room {room.room_number}</span>
              <h3 className="text-2xl font-bold text-slate-800">{room.room_type || 'General Room'}</h3>
            </div>
            
            <div className="flex flex-col gap-3 mb-6 flex-grow">
              <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded">
                <Users size={18} className="mr-3 text-slate-400" /> 
                <span className="text-slate-500 mr-1">Capacity:</span> {room.capacity} seats
              </div>
              {room.facilities && room.facilities.length > 0 && (
                <div className="flex items-start text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded">
                  <Settings size={18} className="mr-3 mt-0.5 text-slate-400" /> 
                  <div>
                    <span className="text-slate-500 block mb-1">Facilities:</span>
                    <div className="flex flex-wrap gap-1">
                      {room.facilities.map(f => (
                        <span key={f.facility_id} className="bg-white border border-slate-100 text-xs px-2 py-0.5 rounded text-slate-600">{f.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {user?.role === 'student' && (
                <div className="mt-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Suggest to Faculty:</label>
                  <select 
                    className="input-field w-full text-sm py-2"
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                  >
                    {facultyList.map(f => (
                      <option key={f.user_id} value={f.user_id}>{f.name} ({f.department || 'Faculty'})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <button onClick={() => handleBook(room.room_id)} className="w-full btn-primary py-3 font-bold text-sm tracking-wide">
              {user?.role === 'student' ? 'SUGGEST / REQUEST ROOM' : 'BOOK THIS SPACE'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
