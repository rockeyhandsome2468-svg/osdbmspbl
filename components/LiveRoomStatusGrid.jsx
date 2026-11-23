import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { occupancyWS } from '../services/websocket';
import { 
  Building2, 
  Search, 
  Filter, 
  RefreshCw, 
  Sparkles, 
  Users, 
  Clock, 
  Calendar, 
  Tv, 
  Wind, 
  Layers, 
  Mic, 
  AlertCircle, 
  CheckCircle2, 
  LogIn, 
  LogOut,
  MapPin,
  Flame,
  Check,
  Zap
} from 'lucide-react';
import ChangeClassroomModal from './ChangeClassroomModal';

const STATUS_CONFIG = {
  vacant: {
    color: 'bg-emerald-500',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/70',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    label: 'Vacant',
    dot: 'bg-emerald-500'
  },
  occupied: {
    color: 'bg-rose-500',
    border: 'border-rose-200',
    bg: 'bg-rose-50/70',
    text: 'text-rose-800',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    label: 'Occupied',
    dot: 'bg-rose-500 animate-pulse'
  },
  reserved: {
    color: 'bg-sky-500',
    border: 'border-sky-200',
    bg: 'bg-sky-50/70',
    text: 'text-sky-800',
    badge: 'bg-sky-100 text-sky-800 border-sky-300',
    label: 'Reserved / Upcoming',
    dot: 'bg-sky-500'
  },
  maintenance: {
    color: 'bg-slate-400',
    border: 'border-slate-300',
    bg: 'bg-slate-100/70',
    text: 'text-slate-700',
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
    label: 'Under Maintenance',
    dot: 'bg-slate-400'
  },
  needs_verification: {
    color: 'bg-amber-500',
    border: 'border-amber-200',
    bg: 'bg-amber-50/80',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    label: 'Needs Verification',
    dot: 'bg-amber-500 animate-ping'
  }
};

export default function LiveRoomStatusGrid({ refreshTrigger }) {
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showVacantOnly, setShowVacantOnly] = useState(false);

  // Modal State for Move Class
  const [selectedSessionForMove, setSelectedSessionForMove] = useState(null);

  const fetchRooms = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const params = {};
      if (selectedBuilding) params.building_id = selectedBuilding;
      if (selectedFloor) params.floor = selectedFloor;
      if (selectedRoomType) params.room_type = selectedRoomType;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (showVacantOnly) params.vacant_only = true;
      if (search.trim()) params.search = search.trim();

      const [roomRes, bldgRes] = await Promise.all([
        api.get('/occupancy/live-status', { params }),
        api.get('/buildings/')
      ]);

      setRooms(roomRes.data);
      setBuildings(bldgRes.data);
      setLastSync(new Date());
    } catch (err) {
      console.error("Failed to load live rooms", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedBuilding, selectedFloor, selectedRoomType, selectedStatus, showVacantOnly, refreshTrigger]);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRooms(true);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Setup WebSocket Listener + Polling Fallback
  useEffect(() => {
    occupancyWS.connect();

    const unsubscribe = occupancyWS.subscribe((event) => {
      // Whenever any occupancy or booking event occurs, refresh silently
      fetchRooms(true);
    });

    // 10-second polling fallback
    const interval = setInterval(() => {
      fetchRooms(true);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleQuickCheckIn = async (roomId) => {
    if (!window.confirm("Check in to this classroom now?")) return;
    try {
      await api.post('/occupancy/check-in', { room_id: roomId });
      fetchRooms(true);
    } catch (err) {
      alert(err.response?.data?.detail || "Check-in failed.");
    }
  };

  const handleQuickCheckOut = async (sessionId, roomId) => {
    if (!window.confirm("Check out of this classroom now?")) return;
    try {
      await api.post('/occupancy/check-out', { session_id: sessionId, room_id: roomId });
      fetchRooms(true);
    } catch (err) {
      alert(err.response?.data?.detail || "Check-out failed.");
    }
  };

  const handleAutoRelease = async (bookingId, roomNumber) => {
    if (!window.confirm(`Auto-release ghost booking in Room ${roomNumber}? This will mark the room as Vacant and issue 1 strike to the user.`)) return;
    try {
      const res = await api.post(`/occupancy/release-abandoned/${bookingId}`);
      alert(res.data.message);
      fetchRooms(true);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to auto-release booking.");
    }
  };

  // Metrics counts
  const counts = {
    all: rooms.length,
    vacant: rooms.filter(r => r.live_status === 'vacant').length,
    occupied: rooms.filter(r => r.live_status === 'occupied').length,
    reserved: rooms.filter(r => r.live_status === 'reserved').length,
    maintenance: rooms.filter(r => r.live_status === 'maintenance').length,
    needs_verification: rooms.filter(r => r.live_status === 'needs_verification').length
  };

  const renderFacilityIcon = (facilityName) => {
    const name = facilityName.toLowerCase();
    if (name.includes('projector')) return <Tv size={12} title={facilityName} />;
    if (name.includes('air') || name.includes('ac')) return <Wind size={12} title={facilityName} />;
    if (name.includes('board')) return <Layers size={12} title={facilityName} />;
    if (name.includes('mic') || name.includes('sound')) return <Mic size={12} title={facilityName} />;
    return <Sparkles size={12} title={facilityName} />;
  };

  return (
    <div className="card shadow-xl border border-slate-100 p-6 md:p-8 bg-white/90 backdrop-blur-xl mb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/10 text-emerald-700 text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Sensor & Occupancy Stream
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Updated {lastSync.toLocaleTimeString()}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Live Classroom Status
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time physical occupancy, upcoming class reservations, and campus spatial availability.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Quick Filter: Show Vacant Rooms */}
          <button
            onClick={() => setShowVacantOnly(prev => !prev)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
              showVacantOnly 
                ? 'bg-emerald-600 text-white shadow-emerald-600/20 ring-2 ring-emerald-500' 
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Sparkles size={16} /> Show Vacant Rooms ({counts.vacant})
          </button>

          <button
            onClick={() => fetchRooms()}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Force refresh"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin text-brand-teal" : ""} />
          </button>
        </div>
      </div>

      {/* Status Summary Pills / Quick Status Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        <button
          onClick={() => { setSelectedStatus('all'); setShowVacantOnly(false); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'all' && !showVacantOnly
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">All Rooms</span>
          <span className="text-xl font-black">{counts.all}</span>
        </button>

        <button
          onClick={() => { setSelectedStatus('vacant'); setShowVacantOnly(false); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'vacant' || showVacantOnly
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">Vacant</span>
          </div>
          <span className="text-xl font-black mt-0.5 block">{counts.vacant}</span>
        </button>

        <button
          onClick={() => { setSelectedStatus('occupied'); setShowVacantOnly(false); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'occupied'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">Occupied</span>
          </div>
          <span className="text-xl font-black mt-0.5 block">{counts.occupied}</span>
        </button>

        <button
          onClick={() => { setSelectedStatus('reserved'); setShowVacantOnly(false); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'reserved'
              ? 'bg-sky-600 text-white border-sky-600 shadow-md'
              : 'bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">Reserved</span>
          </div>
          <span className="text-xl font-black mt-0.5 block">{counts.reserved}</span>
        </button>

        <button
          onClick={() => { setSelectedStatus('needs_verification'); setShowVacantOnly(false); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'needs_verification'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
              : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">Discrepancy</span>
          </div>
          <span className="text-xl font-black mt-0.5 block">{counts.needs_verification}</span>
        </button>

        <button
          onClick={() => { setSelectedStatus('maintenance'); setShowVacantOnly(false); }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'maintenance'
              ? 'bg-slate-700 text-white border-slate-700 shadow-md'
              : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">Maintenance</span>
          </div>
          <span className="text-xl font-black mt-0.5 block">{counts.maintenance}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 flex flex-wrap gap-3 items-center">
        {/* Search by room number */}
        <div className="relative flex-grow min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search room (e.g. CR-1, LT-2)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>

        {/* Building Filter */}
        <div className="min-w-[150px]">
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal font-medium"
          >
            <option value="">All Buildings</option>
            {buildings.map(b => (
              <option key={b.building_id} value={b.building_id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Floor Filter */}
        <div className="min-w-[120px]">
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal font-medium"
          >
            <option value="">All Floors</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
            <option value="4">Floor 4</option>
          </select>
        </div>

        {/* Room Type Filter */}
        <div className="min-w-[140px]">
          <select
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal font-medium"
          >
            <option value="">All Room Types</option>
            <option value="Classroom">Classroom</option>
            <option value="Lecture Hall">Lecture Hall</option>
            <option value="Lab">Lab</option>
            <option value="Seminar Room">Seminar Room</option>
            <option value="Auditorium">Auditorium</option>
            <option value="Meeting Room">Meeting Room</option>
          </select>
        </div>

        {(selectedBuilding || selectedFloor || selectedRoomType || search || showVacantOnly || selectedStatus !== 'all') && (
          <button
            onClick={() => {
              setSelectedBuilding('');
              setSelectedFloor('');
              setSelectedRoomType('');
              setSelectedStatus('all');
              setShowVacantOnly(false);
              setSearch('');
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Classroom Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <RefreshCw size={28} className="animate-spin text-brand-teal" />
          <p className="text-sm font-semibold">Loading real-time classroom telemetry...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Building2 size={36} className="mx-auto text-slate-400 mb-2" />
          <p className="text-base font-bold text-slate-700">No classrooms match your filter criteria.</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting your search or clearing active filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => {
            const config = STATUS_CONFIG[room.live_status] || STATUS_CONFIG.vacant;

            return (
              <div
                key={room.room_id}
                className={`rounded-2xl p-5 border-2 ${config.border} bg-white transition-all duration-200 hover:shadow-lg flex flex-col justify-between relative group`}
              >
                <div>
                  {/* Card Top: Room Code & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{room.room_number}</h3>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          F{room.floor}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Building2 size={13} className="text-slate-400" /> {room.building_name}
                      </p>
                    </div>

                    {/* Status Indicator Pill */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${config.badge}`}>
                      <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
                      {config.label}
                    </span>
                  </div>

                  {/* Room Specs & Capacity */}
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 mb-4 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-1 text-slate-700">
                      <Users size={14} className="text-brand-navy" /> {room.capacity} Seats
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-700">{room.room_type || 'General Room'}</span>
                  </div>

                  {/* Status Specific Details Area */}
                  <div className="space-y-2 mb-4 text-xs">
                    {room.live_status === 'occupied' && (
                      <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100 space-y-1 text-rose-900">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Faculty:</span>
                          <span className="font-semibold">{room.faculty_name || 'Assigned Faculty'}</span>
                        </div>
                        {room.class_info && (
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Subject:</span>
                            <span className="font-medium truncate max-w-[180px]">{room.class_info}</span>
                          </div>
                        )}
                        {room.actual_checkin && (
                          <div className="flex justify-between items-center text-slate-500">
                            <span>Checked In:</span>
                            <span>{new Date(room.actual_checkin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        )}
                        {room.expected_available_time && (
                          <div className="flex justify-between items-center text-slate-500">
                            <span>Expected Free:</span>
                            <span className="font-bold text-rose-700">{new Date(room.expected_available_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {room.live_status === 'reserved' && (
                      <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100 space-y-1 text-sky-900">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Reserved For:</span>
                          <span className="font-semibold">{room.faculty_name || 'Faculty Member'}</span>
                        </div>
                        {room.booking_start && (
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Time:</span>
                            <span className="font-semibold text-sky-700">
                              {new Date(room.booking_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(room.booking_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        )}
                        <p className="text-[11px] text-sky-600/80 italic mt-1">Awaiting physical faculty check-in</p>
                      </div>
                    )}

                    {room.live_status === 'needs_verification' && (
                      <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                        <div className="flex items-center gap-1 font-bold text-amber-800">
                          <AlertCircle size={14} className="shrink-0 text-amber-600" />
                          <span>Discrepancy / Overdue</span>
                        </div>
                        <p className="text-[11px] text-amber-800/90 leading-tight">
                          {room.status_details}
                        </p>
                      </div>
                    )}

                    {room.live_status === 'maintenance' && (
                      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                        <p className="font-bold text-slate-800">{room.class_info || 'Facility Maintenance'}</p>
                        <p className="text-[11px] text-slate-500">
                          Expected completion: {room.expected_available_time ? new Date(room.expected_available_time).toLocaleDateString() : 'TBD'}
                        </p>
                      </div>
                    )}

                    {room.live_status === 'vacant' && (
                      <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-emerald-800">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>Ready & Available</span>
                        </div>
                        <p className="text-[11px] text-emerald-700/80 mt-0.5">
                          {room.status_details}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Facilities Badges and Bottom Action */}
                <div>
                  {room.facilities?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 mb-3">
                      {room.facilities.map((fac) => (
                        <span
                          key={fac.facility_id}
                          className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded"
                        >
                          {renderFacilityIcon(fac.name)} {fac.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions for Faculty and Admin */}
                  {(user?.role === 'faculty' || user?.role === 'admin') && (
                    <div className="flex gap-2 pt-2">
                      {room.live_status === 'vacant' && (
                        <button
                          onClick={() => handleQuickCheckIn(room.room_id)}
                          className="w-full bg-slate-100 hover:bg-brand-teal hover:text-brand-navy text-slate-800 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <LogIn size={14} /> Quick Check-In
                        </button>
                      )}

                      {room.active_session_id && (
                        <button
                          onClick={() => handleQuickCheckOut(room.active_session_id, room.room_id)}
                          className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 rounded-xl text-xs transition-colors border border-rose-200 flex items-center justify-center gap-1.5"
                        >
                          <LogOut size={14} /> Vacate / Checkout
                        </button>
                      )}

                      {room.live_status === 'needs_verification' && room.active_booking_id && (
                        <button
                          onClick={() => handleAutoRelease(room.active_booking_id, room.room_number)}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow flex items-center justify-center gap-1.5"
                          title="Auto-release ghost booking and issue strike"
                        >
                          <Zap size={14} /> Auto-Release (Strike User)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Change Classroom Modal if triggered */}
      {selectedSessionForMove && (
        <ChangeClassroomModal
          isOpen={!!selectedSessionForMove}
          onClose={() => setSelectedSessionForMove(null)}
          currentSession={selectedSessionForMove}
          onSuccess={() => fetchRooms(true)}
        />
      )}
    </div>
  );
}

