import React, { useEffect, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { 
  ShieldAlert, CalendarCheck, Settings, Building, Trash2, Activity, Clock, 
  RefreshCw, History, LogOut, Wrench, CheckCircle, Plus, X, AlertTriangle,
  FileText, Download, UserCheck, UserX, AlertOctagon, Zap, Filter, Search, RotateCcw
} from 'lucide-react';

const COMMON_MAINTENANCE_REASONS = [
  "AC Servicing / Repair",
  "4K Projector / Display Malfunction",
  "Audio / Microphone System Repair",
  "Smartboard Calibration / Hardware Issue",
  "Electrical & Lighting Repair",
  "Furniture & Desk Maintenance",
  "Deep Cleaning & Sanitization",
  "Routine Semester Inspection"
];

export default function AdminPanel() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('bookings');
  
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [occupancySessions, setOccupancySessions] = useState([]);
  const [changeLogs, setChangeLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Maintenance Modal State
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    room_id: '',
    reason: 'AC Servicing / Repair',
    custom_reason: '',
    start_date: '',
    end_date: '',
    status: 'In Progress'
  });

  // Audit Trail State
  const [selectedAuditCategory, setSelectedAuditCategory] = useState('all');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);
  const [auditActions, setAuditActions] = useState([]);
  const [selectedAuditAction, setSelectedAuditAction] = useState('all');
  const [selectedAuditRole, setSelectedAuditRole] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // User Governance State
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [governanceSearch, setGovernanceSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const calls = [
        api.get('/bookings/'),
        api.get('/classrooms/'),
        api.get('/maintenance/')
      ];
      if (user?.role === 'admin') {
        calls.push(api.get('/occupancy/active'));
        calls.push(api.get('/classes/room-change-history'));
      }
      const results = await Promise.all(calls);
      setBookings(results[0].data);
      setRooms(results[1].data);
      setMaintenance(results[2].data);
      if (user?.role === 'admin') {
        setOccupancySessions(results[3].data);
        setChangeLogs(results[4].data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditData = async (page = 1, categoryOverride = null) => {
    if (user?.role !== 'admin') return;
    setAuditLoading(true);
    try {
      const activeCategory = categoryOverride !== null ? categoryOverride : selectedAuditCategory;
      const params = { page, limit: 50 };
      if (activeCategory && activeCategory !== 'all') params.category = activeCategory;
      if (selectedAuditAction && selectedAuditAction !== 'all') params.action = selectedAuditAction;
      if (selectedAuditRole && selectedAuditRole !== 'all') params.actor_role = selectedAuditRole;
      if (auditSearch.trim()) params.search = auditSearch.trim();

      const [logsRes, statsRes] = await Promise.all([
        api.get('/audit/', { params }),
        api.get('/audit/stats')
      ]);

      setAuditLogs(logsRes.data.logs || []);
      setAuditTotal(logsRes.data.total || 0);
      setAuditPage(logsRes.data.page || 1);
      setAuditPages(logsRes.data.pages || 1);
      setAuditActions(logsRes.data.actions || []);
      setAuditStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (user?.role !== 'admin') return;
    setUsersLoading(true);
    try {
      const res = await api.get('/users/');
      setUsersList(res.data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditData(auditPage);
    } else if (activeTab === 'governance') {
      fetchUsers();
    }
  }, [activeTab, selectedAuditCategory, selectedAuditAction, selectedAuditRole, auditPage]);

  const handleCancelBooking = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.post(`/bookings/${id}/cancel`);
      alert("Booking cancelled");
      fetchData();
    } catch (err) {
      alert("Failed to cancel");
    }
  };

  const handleApproveBooking = async (id) => {
    try {
      await api.post(`/bookings/${id}/approve`);
      alert("Booking approved!");
      fetchData();
    } catch (err) {
      alert("Failed to approve");
    }
  };

  const handleForceCheckout = async (sessionId, roomNumber) => {
    if (!window.confirm(`Force checkout session for Room ${roomNumber}? This will mark the room as Vacant immediately.`)) return;
    try {
      await api.post('/occupancy/admin-override', {
        session_id: sessionId,
        action: 'force_checkout'
      });
      alert(`Session in Room ${roomNumber} has been terminated.`);
      fetchData();
    } catch (err) {
      alert("Failed to override session.");
    }
  };

  // Maintenance handlers
  const handleOpenMaintenanceModal = (roomId = '') => {
    const now = new Date();
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const toLocalISO = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setMaintenanceForm({
      room_id: roomId ? String(roomId) : (rooms.length > 0 ? String(rooms[0].room_id) : ''),
      reason: 'AC Servicing / Repair',
      custom_reason: '',
      start_date: toLocalISO(now),
      end_date: toLocalISO(tomorrow),
      status: 'In Progress'
    });
    setShowMaintenanceModal(true);
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    if (!maintenanceForm.room_id) {
      alert("Please select a classroom.");
      return;
    }
    const finalReason = maintenanceForm.reason === 'Other' 
      ? maintenanceForm.custom_reason 
      : maintenanceForm.reason;
    if (!finalReason.trim()) {
      alert("Please specify a reason for maintenance.");
      return;
    }

    setSubmittingMaintenance(true);
    try {
      await api.post('/maintenance/', {
        room_id: parseInt(maintenanceForm.room_id),
        start_date: new Date(maintenanceForm.start_date).toISOString(),
        end_date: new Date(maintenanceForm.end_date).toISOString(),
        reason: finalReason,
        status: maintenanceForm.status
      });
      setShowMaintenanceModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to schedule maintenance.");
    } finally {
      setSubmittingMaintenance(false);
    }
  };

  const handleCompleteMaintenance = async (logId) => {
    if (!window.confirm("Mark this maintenance as completed and restore the room to vacant?")) return;
    try {
      await api.patch(`/maintenance/${logId}/complete`);
      fetchData();
    } catch (err) {
      alert("Failed to complete maintenance.");
    }
  };

  const handleDeleteMaintenance = async (logId) => {
    if (!window.confirm("Delete this maintenance record?")) return;
    try {
      await api.delete(`/maintenance/${logId}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete maintenance record.");
    }
  };

  // Auto-Release & Sweep Handlers
  const handleSweepNoShows = async () => {
    if (!window.confirm("Run campus-wide sweep to auto-release all ghost bookings that exceeded the 15-minute grace period?")) return;
    try {
      const res = await api.post('/occupancy/sweep-abandoned');
      alert(`Campus Sweep Complete!\nReleased ${res.data.released_count} ghost bookings and updated room availability.`);
      fetchData();
      if (activeTab === 'audit') fetchAuditData();
      if (activeTab === 'governance') fetchUsers();
    } catch (err) {
      alert("Failed to run campus sweep.");
    }
  };

  const handleReleaseAbandoned = async (bookingId, roomNumber) => {
    if (!window.confirm(`Auto-release ghost booking in Room ${roomNumber}? This will restore the room to Vacant and issue 1 strike to the user.`)) return;
    try {
      const res = await api.post(`/occupancy/release-abandoned/${bookingId}`);
      alert(res.data.message);
      fetchData();
      if (activeTab === 'audit') fetchAuditData();
      if (activeTab === 'governance') fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to auto-release booking.");
    }
  };

  // Strike Management Handlers
  const handlePardonStrike = async (userId, userName) => {
    if (!window.confirm(`Pardon 1 strike for ${userName}?`)) return;
    try {
      const res = await api.post(`/users/${userId}/pardon-strike`);
      alert(`Pardon successful! ${userName} now has ${res.data.strikes_count}/3 strikes.`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to pardon strike.");
    }
  };

  const handleResetStrikes = async (userId, userName) => {
    if (!window.confirm(`Clear all strikes and restore full booking privileges for ${userName}?`)) return;
    try {
      await api.post(`/users/${userId}/reset-strikes`);
      alert(`All strikes cleared for ${userName}.`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reset strikes.");
    }
  };

  const handleIssueStrike = async (userId, userName) => {
    const reason = window.prompt(`Enter reason for administrative strike issued to ${userName}:`, "Unattended reservation / policy violation");
    if (!reason || !reason.trim()) return;
    try {
      const res = await api.post(`/users/${userId}/issue-strike`, { reason: reason.trim() });
      alert(`Strike issued to ${userName}. Current strikes: ${res.data.strikes_count}/3.`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to issue strike.");
    }
  };

  // Export CSV Handler
  const handleExportCSV = async () => {
    try {
      const res = await api.get('/audit/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Campus_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export audit CSV.");
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'faculty') {
    return <div className="text-center mt-20 text-red-500 text-xl font-bold">Unauthorized.</div>;
  }

  const renderBookings = () => (
    <div className="overflow-x-auto bg-white rounded-xl shadow border border-slate-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <th className="p-4 font-semibold text-sm">ID</th>
            <th className="p-4 font-semibold text-sm">Room</th>
            <th className="p-4 font-semibold text-sm">Booked By</th>
            <th className="p-4 font-semibold text-sm">Time</th>
            <th className="p-4 font-semibold text-sm">Status</th>
            <th className="p-4 font-semibold text-sm">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map(b => (
            <tr key={b.booking_id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 text-sm text-slate-500">#{b.booking_id}</td>
              <td className="p-4 font-medium">{b.room?.room_number || `Room ID ${b.room_id}`}</td>
              <td className="p-4">
                <div className="font-medium text-slate-800">{b.user?.name || 'Unknown'}</div>
                <div className="text-xs text-slate-500">{b.user?.role}</div>
              </td>
              <td className="p-4 text-sm">
                <div>{new Date(b.start_time).toLocaleString()}</div>
                <div className="text-slate-500">to {new Date(b.end_time).toLocaleTimeString()}</div>
              </td>
              <td className="p-4">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full 
                  ${b.booking_status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                    b.booking_status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                    b.booking_status === 'preempted' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-800'}`}>
                  {b.booking_status.toUpperCase()}
                </span>
              </td>
              <td className="p-4 flex gap-2">
                {b.booking_status === 'pending' && (
                  <button onClick={() => handleApproveBooking(b.booking_id)} className="text-green-600 hover:text-green-800 p-1 bg-green-50 rounded font-bold text-xs px-2 border border-green-200" title="Approve">
                    APPROVE
                  </button>
                )}
                {(b.booking_status === 'confirmed' || b.booking_status === 'pending') && (
                  <button onClick={() => handleCancelBooking(b.booking_id)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded" title="Reject / Cancel">
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {bookings.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No bookings found.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  const renderRooms = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {rooms.map(r => (
        <div key={r.room_id} className="card border-t-4 border-brand-navy flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold">{r.room_number}</h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-semibold">{r.room_type || 'General'}</span>
            </div>
            <p className="text-sm text-slate-500 mb-3"><Building size={14} className="inline mr-1"/> Capacity: {r.capacity}</p>
          </div>
          <div className="mt-auto space-y-2">
            <span className={`text-xs font-bold px-2 py-1 rounded w-full block text-center
              ${r.status === 'free' ? 'bg-green-100 text-green-700' : 
                r.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              STATUS: {r.status.toUpperCase()}
            </span>
            {user?.role === 'admin' && (
              <button
                onClick={() => handleOpenMaintenanceModal(r.room_id)}
                className="w-full text-xs font-bold text-slate-600 hover:text-brand-navy py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors"
                title="Put this room under maintenance"
              >
                <Wrench size={13} /> Put in Maintenance
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderMaintenance = () => (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Settings size={20} className="text-slate-600" /> Campus Maintenance Logs
          </h3>
          <p className="text-xs text-slate-500">
            Rooms in active maintenance automatically show as "Under Maintenance" on live dashboards and cancel conflicting bookings.
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => handleOpenMaintenanceModal()}
            className="btn-primary flex items-center gap-2 text-sm shadow px-4 py-2 shrink-0"
          >
            <Plus size={16} /> Put Room Under Maintenance
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm">
              <th className="p-4 font-semibold">Room</th>
              <th className="p-4 font-semibold">Reason</th>
              <th className="p-4 font-semibold">Period</th>
              <th className="p-4 font-semibold">Status</th>
              {user?.role === 'admin' && <th className="p-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {maintenance.map(m => {
              const isActive = m.status === 'In Progress' || m.status === 'Scheduled' || m.status === 'active';
              return (
                <tr key={m.log_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">
                    {m.room?.room_number || `Room ID ${m.room_id}`}
                  </td>
                  <td className="p-4 text-sm text-slate-800 font-medium">
                    {m.reason}
                  </td>
                  <td className="p-4 text-xs text-slate-600">
                    <div>{new Date(m.start_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                    <div className="text-slate-400">to {new Date(m.end_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      isActive 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  {user?.role === 'admin' && (
                    <td className="p-4 text-right space-x-2">
                      {isActive && (
                        <button
                          onClick={() => handleCompleteMaintenance(m.log_id)}
                          className="btn-success text-xs px-3 py-1.5 inline-flex items-center gap-1 shadow-sm"
                          title="Mark Completed and restore room to Vacant"
                        >
                          <CheckCircle size={14} /> Complete
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMaintenance(m.log_id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {maintenance.length === 0 && (
              <tr>
                <td colSpan={user?.role === 'admin' ? 5 : 4} className="p-8 text-center text-slate-500 font-medium">
                  No maintenance logs found. Click "Put Room Under Maintenance" to schedule repairs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderOccupancySessions = () => (
    <div className="overflow-x-auto bg-white rounded-xl shadow border border-slate-200">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-bold text-slate-800">Active Classroom Sessions</h3>
          <p className="text-xs text-slate-500">Live verified faculty occupancy across the campus</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSweepNoShows}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition-all"
            title="Auto-release all ghost bookings that passed the 15m grace window without check-in"
          >
            <Zap size={14} /> Sweep Ghost Bookings
          </button>
          <span className="text-xs font-bold bg-rose-100 text-rose-700 px-3 py-1 rounded-full animate-pulse">
            {occupancySessions.length} Active Sessions
          </span>
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm">
            <th className="p-4 font-semibold">Room</th>
            <th className="p-4 font-semibold">Faculty</th>
            <th className="p-4 font-semibold">Check-In Time</th>
            <th className="p-4 font-semibold">Status</th>
            <th className="p-4 font-semibold">Source</th>
            <th className="p-4 font-semibold text-right">Admin Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {occupancySessions.map(s => (
            <tr key={s.session_id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 font-black text-slate-900">{s.room?.room_number || `Room ${s.room_id}`}</td>
              <td className="p-4 text-sm font-semibold text-slate-800">{s.faculty?.name || `User ID ${s.faculty_user_id}`}</td>
              <td className="p-4 text-sm text-slate-600">
                {new Date(s.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="p-4">
                <span className="bg-rose-100 text-rose-700 px-2.5 py-1 text-xs font-extrabold rounded-full">
                  {s.session_status}
                </span>
              </td>
              <td className="p-4 text-xs font-mono text-slate-500">{s.occupancy_source}</td>
              <td className="p-4 text-right">
                <button
                  onClick={() => handleForceCheckout(s.session_id, s.room?.room_number || s.room_id)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors border border-red-200"
                >
                  Force Checkout
                </button>
              </td>
            </tr>
          ))}
          {occupancySessions.length === 0 && (
            <tr>
              <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">
                No active classroom sessions currently recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderRoomChangeLogs = () => (
    <div className="overflow-x-auto bg-white rounded-xl shadow border border-slate-200">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <h3 className="font-bold text-slate-800">Classroom Relocation Audit History</h3>
        <p className="text-xs text-slate-500">Atomic room transfer records and authorized reasons</p>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm">
            <th className="p-4 font-semibold">Change ID</th>
            <th className="p-4 font-semibold">Original Room</th>
            <th className="p-4 font-semibold">Destination Room</th>
            <th className="p-4 font-semibold">Reason</th>
            <th className="p-4 font-semibold">Effective Time</th>
            <th className="p-4 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {changeLogs.map(log => (
            <tr key={log.change_id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 text-xs font-mono text-slate-400">#{log.change_id}</td>
              <td className="p-4 font-bold text-slate-700">Room ID {log.original_room_id}</td>
              <td className="p-4 font-black text-brand-teal">Room ID {log.destination_room_id}</td>
              <td className="p-4 text-sm text-slate-800">{log.change_reason || 'N/A'}</td>
              <td className="p-4 text-sm text-slate-600">
                {new Date(log.effective_start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              <td className="p-4">
                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold rounded-full">
                  {log.change_status}
                </span>
              </td>
            </tr>
          ))}
          {changeLogs.length === 0 && (
            <tr>
              <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">
                No room relocation events recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ==================== AUDIT TRAIL TAB ====================
  const renderAuditTrail = () => {
    const getActionBadgeClass = (action) => {
      switch (action) {
        case 'AUTO_RELEASE_NO_SHOW':
          return 'bg-amber-100 text-amber-900 border-amber-300';
        case 'STRIKE_ISSUED':
        case 'MANUAL_STRIKE_ISSUED':
          return 'bg-purple-100 text-purple-900 border-purple-300';
        case 'STRIKE_PARDONED':
        case 'STRIKES_RESET':
          return 'bg-emerald-100 text-emerald-900 border-emerald-300';
        case 'FORCE_CHECKOUT':
          return 'bg-rose-100 text-rose-900 border-rose-300';
        case 'PREEMPTION_SMART_BUMP':
          return 'bg-sky-100 text-sky-900 border-sky-300';
        case 'PREEMPTION_CANCEL':
          return 'bg-orange-100 text-orange-900 border-orange-300';
        case 'ROOM_TRANSFER':
          return 'bg-teal-100 text-teal-900 border-teal-300';
        case 'MAINTENANCE_SCHEDULED':
        case 'MAINTENANCE_COMPLETED':
          return 'bg-slate-200 text-slate-800 border-slate-300';
        default:
          return 'bg-blue-50 text-blue-800 border-blue-200';
      }
    };

    return (
      <div className="space-y-6">
        {/* Top Audit Statistics Ribbon as Interactive Tabs */}
        {auditStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* 1. Total Events (All) */}
            <button
              type="button"
              onClick={() => {
                setSelectedAuditCategory('all');
                setSelectedAuditAction('all');
                setAuditPage(1);
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                selectedAuditCategory === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30 ring-offset-1'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${selectedAuditCategory === 'all' ? 'bg-slate-300' : 'bg-slate-400'}`}></span>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedAuditCategory === 'all' ? 'text-slate-200' : 'text-slate-500'}`}>
                  Total Events
                </span>
              </div>
              <span className="text-2xl font-black mt-1 block">{auditStats.total_logs}</span>
            </button>

            {/* 2. Ghost Auto-Releases */}
            <button
              type="button"
              onClick={() => {
                setSelectedAuditCategory('no_show');
                setSelectedAuditAction('all');
                setAuditPage(1);
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                selectedAuditCategory === 'no_show'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/40 ring-offset-1'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/70 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${selectedAuditCategory === 'no_show' ? 'bg-amber-200' : 'bg-amber-500'}`}></span>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedAuditCategory === 'no_show' ? 'text-amber-100' : 'text-amber-800'}`}>
                  Ghost Releases
                </span>
              </div>
              <span className="text-2xl font-black mt-1 block">{auditStats.no_show_releases}</span>
            </button>

            {/* 3. Strikes Issued */}
            <button
              type="button"
              onClick={() => {
                setSelectedAuditCategory('strikes');
                setSelectedAuditAction('all');
                setAuditPage(1);
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                selectedAuditCategory === 'strikes'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-500/40 ring-offset-1'
                  : 'bg-purple-50/70 border-purple-200 text-purple-900 hover:bg-purple-100/70 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${selectedAuditCategory === 'strikes' ? 'bg-purple-200' : 'bg-purple-500'}`}></span>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedAuditCategory === 'strikes' ? 'text-purple-100' : 'text-purple-800'}`}>
                  Strikes Issued
                </span>
              </div>
              <span className="text-2xl font-black mt-1 block">{auditStats.strikes_issued}</span>
            </button>

            {/* 4. Smart Bumps */}
            <button
              type="button"
              onClick={() => {
                setSelectedAuditCategory('bumps');
                setSelectedAuditAction('all');
                setAuditPage(1);
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                selectedAuditCategory === 'bumps'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-500/40 ring-offset-1'
                  : 'bg-sky-50/70 border-sky-200 text-sky-900 hover:bg-sky-100/70 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${selectedAuditCategory === 'bumps' ? 'bg-sky-200' : 'bg-sky-500'}`}></span>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedAuditCategory === 'bumps' ? 'text-sky-100' : 'text-sky-800'}`}>
                  Smart Bumps
                </span>
              </div>
              <span className="text-2xl font-black mt-1 block">{auditStats.preemptions}</span>
            </button>

            {/* 5. Force Checkouts */}
            <button
              type="button"
              onClick={() => {
                setSelectedAuditCategory('checkouts');
                setSelectedAuditAction('all');
                setAuditPage(1);
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                selectedAuditCategory === 'checkouts'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/40 ring-offset-1'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900 hover:bg-rose-100/70 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${selectedAuditCategory === 'checkouts' ? 'bg-rose-200' : 'bg-rose-500'}`}></span>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedAuditCategory === 'checkouts' ? 'text-rose-100' : 'text-rose-800'}`}>
                  Force Checkouts
                </span>
              </div>
              <span className="text-2xl font-black mt-1 block">{auditStats.force_checkouts}</span>
            </button>

            {/* 6. Room Transfers */}
            <button
              type="button"
              onClick={() => {
                setSelectedAuditCategory('transfers');
                setSelectedAuditAction('all');
                setAuditPage(1);
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                selectedAuditCategory === 'transfers'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-500/40 ring-offset-1'
                  : 'bg-teal-50/70 border-teal-200 text-teal-900 hover:bg-teal-100/70 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${selectedAuditCategory === 'transfers' ? 'bg-teal-200' : 'bg-teal-500'}`}></span>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedAuditCategory === 'transfers' ? 'text-teal-100' : 'text-teal-800'}`}>
                  Room Transfers
                </span>
              </div>
              <span className="text-2xl font-black mt-1 block">{auditStats.room_transfers}</span>
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search actor, reason, room..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchAuditData(1); }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAuditAction}
              onChange={(e) => setSelectedAuditAction(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-teal"
            >
              <option value="all">All Action Types</option>
              {auditActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={selectedAuditRole}
              onChange={(e) => setSelectedAuditRole(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-teal"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
              <option value="system">System Engine</option>
            </select>

            <button
              onClick={() => fetchAuditData(1)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1"
            >
              <Filter size={13} /> Apply
            </button>

            {selectedAuditCategory !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAuditCategory('all');
                  setSelectedAuditAction('all');
                  setAuditPage(1);
                }}
                className="bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-navy border border-brand-teal/30 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
                title="Reset to All Events"
              >
                <span>Tab Filter: <strong className="font-bold">{
                  selectedAuditCategory === 'no_show' ? 'Ghost Releases' :
                  selectedAuditCategory === 'strikes' ? 'Strikes Issued' :
                  selectedAuditCategory === 'bumps' ? 'Smart Bumps' :
                  selectedAuditCategory === 'checkouts' ? 'Force Checkouts' :
                  selectedAuditCategory === 'transfers' ? 'Room Transfers' : selectedAuditCategory
                }</strong></span>
                <span className="text-slate-500 font-bold ml-1">✕</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="btn-primary flex items-center gap-1.5 text-xs px-4 py-2 shadow"
              title="Download entire audit trail as formatted CSV"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => fetchAuditData(auditPage)}
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
              title="Refresh logs"
            >
              <RefreshCw size={14} className={auditLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Log ID</th>
                  <th className="p-4">Timestamp (UTC)</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">Details & Policy Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {auditLogs.map(log => (
                  <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono text-slate-400">#{log.log_id}</td>
                    <td className="p-4 text-slate-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{log.actor_name || 'System Engine'}</div>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {log.actor_role || 'system'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold border text-[11px] whitespace-nowrap ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {log.target_type ? `${log.target_type}: ${log.target_id || ''}` : 'N/A'}
                    </td>
                    <td className="p-4 text-slate-700 font-medium max-w-md">
                      {log.details || 'No additional note provided'}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && !auditLoading && (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                      No audit records found matching the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing <strong>{auditLogs.length}</strong> of <strong>{auditTotal}</strong> total log entries
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={auditPage <= 1}
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-800">
                Page {auditPage} of {auditPages}
              </span>
              <button
                disabled={auditPage >= auditPages}
                onClick={() => setAuditPage(p => Math.min(auditPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== USER GOVERNANCE & 3-STRIKE TAB ====================
  const renderUserGovernance = () => {
    const filteredUsers = usersList.filter(u => {
      if (!governanceSearch.trim()) return true;
      const s = governanceSearch.toLowerCase();
      return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.role.toLowerCase().includes(s);
    });

    return (
      <div className="space-y-6">
        {/* Policy Explainer Banner */}
        <div className="bg-gradient-to-r from-purple-50 via-slate-50 to-white p-5 rounded-2xl border border-purple-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-purple-600 text-white rounded-xl shadow shrink-0">
              <AlertOctagon size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">3-Strike No-Show Accountability Policy</h3>
              <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
                Users accumulate 1 strike each time a reserved room is abandoned without check-in. Reaching <strong>3 strikes</strong> triggers an automated <strong>14-day reservation suspension</strong>. Administrators can inspect standing, grant pardons, or manually adjust strikes.
              </p>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 shrink-0"
            title="Refresh user list"
          >
            <RefreshCw size={16} className={usersLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* User Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search user by name, email, or role..."
              value={governanceSearch}
              onChange={(e) => setGovernanceSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {filteredUsers.length} Users Listed
          </span>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Role & Priority</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Strikes Status</th>
                  <th className="p-4">Booking Privilege</th>
                  <th className="p-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map(u => {
                  const strikes = u.strikes_count || 0;
                  const isSuspended = u.is_suspended;

                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 text-sm">{u.name}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-red-100 text-red-800' :
                          u.role === 'faculty' ? 'bg-blue-100 text-blue-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.role}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">Priority L{u.priority_level}</span>
                      </td>
                      <td className="p-4 text-slate-600">
                        {u.department || 'Campus Community'}
                      </td>
                      <td className="p-4">
                        {strikes === 0 && (
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle size={12} /> 0 / 3 (Good)
                          </span>
                        )}
                        {strikes === 1 && (
                          <span className="bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-300 inline-flex items-center gap-1">
                            <AlertTriangle size={12} /> 1 / 3 (Caution)
                          </span>
                        )}
                        {strikes === 2 && (
                          <span className="bg-orange-100 text-orange-900 font-bold px-2.5 py-1 rounded-full border border-orange-300 inline-flex items-center gap-1">
                            <AlertOctagon size={12} /> 2 / 3 (Final Warning)
                          </span>
                        )}
                        {strikes >= 3 && (
                          <span className="bg-rose-600 text-white font-extrabold px-2.5 py-1 rounded-full shadow-sm animate-pulse inline-flex items-center gap-1">
                            <UserX size={12} /> 3 / 3 (SUSPENDED)
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {isSuspended ? (
                          <div>
                            <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              Suspended
                            </span>
                            {u.suspension_until && (
                              <div className="text-[10px] text-rose-600 mt-0.5">
                                Until {new Date(u.suspension_until).toLocaleDateString([], { dateStyle: 'short' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                            Active & Eligible
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handlePardonStrike(u.user_id, u.name)}
                          disabled={strikes === 0}
                          className="px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Pardon 1 strike"
                        >
                          Pardon (-1)
                        </button>
                        <button
                          onClick={() => handleResetStrikes(u.user_id, u.name)}
                          disabled={strikes === 0}
                          className="px-2.5 py-1 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Clear all strikes"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => handleIssueStrike(u.user_id, u.name)}
                          className="px-2.5 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold transition-colors"
                          title="Manually issue strike"
                        >
                          + Issue Strike
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderMaintenanceModal = () => {
    if (!showMaintenanceModal) return null;

    const modalContent = (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setShowMaintenanceModal(false)}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-navy to-[#113a60] p-6 text-white flex justify-between items-start shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-amber-400 text-slate-900 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Wrench size={12} /> Maintenance Mode
                </span>
                <span className="text-blue-100 text-xs font-medium">Admin Action</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">Put Room Under Maintenance</h2>
              <p className="text-blue-100/80 text-xs mt-1">
                Marks the room as unavailable on live displays and cancels any overlapping bookings.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setShowMaintenanceModal(false)} 
              className="text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleCreateMaintenance} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>System Precedence:</strong> Maintenance overrides all bookings and physical occupancy. Conflicting reservations will receive cancellation alerts automatically.
              </span>
            </div>

            {/* Select Room */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Classroom
              </label>
              <select
                value={maintenanceForm.room_id}
                onChange={(e) => setMaintenanceForm(prev => ({ ...prev, room_id: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-800 font-bold rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-teal text-sm"
                required
              >
                <option value="">-- Choose Classroom --</option>
                {rooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.room_number} — {r.room_type || 'General'} (Capacity: {r.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Maintenance Reason / Work Description
              </label>
              <select
                value={maintenanceForm.reason}
                onChange={(e) => setMaintenanceForm(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-teal text-sm mb-2"
              >
                {COMMON_MAINTENANCE_REASONS.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
                <option value="Other">Other / Custom Description</option>
              </select>

              {maintenanceForm.reason === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter specific repair work..."
                  value={maintenanceForm.custom_reason}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, custom_reason: e.target.value }))}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal text-sm"
                  required
                />
              )}
            </div>

            {/* Time Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={maintenanceForm.start_date}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={maintenanceForm.end_date}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal text-xs"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Initial Status
              </label>
              <select
                value={maintenanceForm.status}
                onChange={(e) => setMaintenanceForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal text-sm font-semibold"
              >
                <option value="In Progress">In Progress (Active Immediately)</option>
                <option value="Scheduled">Scheduled (Future Maintenance)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                disabled={submittingMaintenance}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingMaintenance || !maintenanceForm.room_id}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {submittingMaintenance ? 'Applying...' : 'Apply Maintenance'}
                <Wrench size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-red-100 p-2 rounded-lg text-red-600">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">
            {user?.role === 'admin' ? 'Admin Control Center' : 'Booking Management'}
          </h1>
          <p className="text-slate-500">
            {user?.role === 'admin' ? 'Full system visibility, live occupancy override, and management' : 'Manage your bookings and student requests'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
        <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'bookings' ? 'bg-brand-navy text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
          <CalendarCheck size={16} /> {user?.role === 'admin' ? 'All Bookings' : 'My Bookings & Requests'}
        </button>
        {user?.role === 'admin' && (
          <button onClick={() => setActiveTab('occupancy')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'occupancy' ? 'bg-brand-navy text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Activity size={16} /> Live Occupancy ({occupancySessions.length})
          </button>
        )}
        {user?.role === 'admin' && (
          <button onClick={() => setActiveTab('relocations')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'relocations' ? 'bg-brand-navy text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
            <History size={16} /> Room Change Audit
          </button>
        )}
        {user?.role === 'admin' && (
          <button onClick={() => setActiveTab('rooms')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'rooms' ? 'bg-brand-navy text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Building size={16} /> Total Rooms ({rooms.length})
          </button>
        )}
        {user?.role === 'admin' && (
          <button onClick={() => setActiveTab('maintenance')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'maintenance' ? 'bg-brand-navy text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Settings size={16} /> Maintenance Logs ({maintenance.length})
          </button>
        )}
        {user?.role === 'admin' && (
          <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'audit' ? 'bg-brand-navy text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
            <FileText size={16} /> Audit Trail ({auditTotal})
          </button>
        )}
        {user?.role === 'admin' && (
          <button onClick={() => setActiveTab('governance')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'governance' ? 'bg-brand-navy text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
            <UserCheck size={16} /> User Governance & Strikes
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading admin data...</div>
      ) : (
        <div>
          {activeTab === 'bookings' && renderBookings()}
          {activeTab === 'occupancy' && renderOccupancySessions()}
          {activeTab === 'relocations' && renderRoomChangeLogs()}
          {activeTab === 'rooms' && renderRooms()}
          {activeTab === 'maintenance' && renderMaintenance()}
          {activeTab === 'audit' && renderAuditTrail()}
          {activeTab === 'governance' && renderUserGovernance()}
        </div>
      )}

      {renderMaintenanceModal()}
    </div>
  );
}
