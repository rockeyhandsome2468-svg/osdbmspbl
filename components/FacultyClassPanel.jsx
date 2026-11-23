import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { LogIn, LogOut, RefreshCw, Clock, AlertTriangle, CheckCircle, MapPin, Calendar, BookOpen } from 'lucide-react';
import ChangeClassroomModal from './ChangeClassroomModal';

export default function FacultyClassPanel({ onStatusChanged }) {
  const { user } = useContext(AuthContext);
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchClassData = async () => {
    try {
      const res = await api.get('/faculty/current-class');
      setClassData(res.data);
    } catch (err) {
      console.error("Failed to load current class data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassData();
  }, []);

  const handleCheckIn = async (roomId, bookingId) => {
    if (!window.confirm("Confirm check-in to mark this classroom as Occupied?")) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await api.post('/occupancy/check-in', {
        room_id: roomId,
        booking_id: bookingId
      });
      setFeedback({ type: 'success', message: "Successfully checked in! Classroom is now marked Occupied." });
      await fetchClassData();
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      const msg = err.response?.data?.detail || "Check-in failed. Please verify room availability.";
      setFeedback({ type: 'error', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async (sessionId, roomId) => {
    if (!window.confirm("Confirm check-out to release this room and mark it as Vacant?")) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await api.post('/occupancy/check-out', {
        session_id: sessionId,
        room_id: roomId
      });
      setFeedback({ type: 'success', message: "Successfully checked out! Classroom has been released." });
      await fetchClassData();
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      const msg = err.response?.data?.detail || "Check-out failed.";
      setFeedback({ type: 'error', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  if (user?.role !== 'faculty' && user?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="card mb-8 p-6 flex items-center justify-center text-slate-500 gap-3">
        <RefreshCw size={20} className="animate-spin text-brand-teal" />
        <span className="text-sm font-semibold">Loading your active teaching sessions...</span>
      </div>
    );
  }

  const activeSession = classData?.active_session;
  const currentBooking = classData?.current_booking;

  return (
    <div className="card mb-8 p-6 border-l-4 border-brand-teal shadow-lg bg-white relative">
      {/* Background visual cue */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-navy text-brand-teal rounded-2xl shadow-sm">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">My Teaching Panel & Live Occupancy</h2>
              {activeSession ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span> Class in Session
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                  Ready for Check-In
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your physical classroom presence, manage check-in/out, or move to another room.
            </p>
          </div>
        </div>

        <button 
          onClick={fetchClassData}
          title="Refresh Session"
          className="self-end md:self-auto text-xs font-bold text-slate-500 hover:text-brand-navy flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw size={13} className={actionLoading ? "animate-spin" : ""} /> Sync Session
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-semibold mb-4 flex items-center gap-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle size={18} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={18} className="text-red-600 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* State A: Active Physical Session */}
      {activeSession ? (
        <div className="bg-gradient-to-r from-red-50/50 via-slate-50 to-white p-5 rounded-2xl border border-red-200/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Currently Occupying</p>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="text-red-500" size={20} />
                <span className="text-2xl font-black text-slate-900">{activeSession.room_number}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Duration</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="text-brand-teal" size={20} />
                <span className="text-2xl font-black text-slate-900">{activeSession.duration_minutes} mins</span>
                <span className="text-xs text-slate-400 font-semibold">(since {new Date(activeSession.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={actionLoading}
                className="bg-brand-navy hover:bg-[#0e3252] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow flex items-center gap-2 transition-all"
              >
                <RefreshCw size={16} /> Move Class
              </button>

              <button
                onClick={() => handleCheckOut(activeSession.session_id, activeSession.room_id)}
                disabled={actionLoading}
                className="btn-danger flex items-center gap-2 text-sm shadow"
              >
                <LogOut size={16} /> Check Out / Vacate Room
              </button>
            </div>
          </div>
        </div>
      ) : currentBooking ? (
        /* State B: Booking scheduled, awaiting check-in */
        <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Upcoming Scheduled Class</p>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="text-brand-navy" size={20} />
                <span className="text-2xl font-black text-slate-900">{currentBooking.room_number}</span>
                <span className="text-sm text-slate-600 font-medium truncate max-w-[150px]">({currentBooking.purpose || 'Lecture'})</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Time Interval</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="text-brand-teal" size={18} />
                <span className="text-sm font-bold text-slate-800">
                  {new Date(currentBooking.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(currentBooking.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>

            <div className="flex justify-start md:justify-end">
              <button
                onClick={() => handleCheckIn(currentBooking.room_id, currentBooking.booking_id)}
                disabled={actionLoading}
                className="btn-primary flex items-center gap-2 text-sm shadow-md"
              >
                <LogIn size={18} /> Check In / Mark as Occupied
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* State C: No scheduled booking right now */
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-slate-400" size={20} />
            <span className="text-sm font-semibold text-slate-600">
              No active booking assigned to you right now. You can check into any room from the Live Grid below.
            </span>
          </div>
        </div>
      )}

      {/* Change Classroom Modal */}
      {activeSession && (
        <ChangeClassroomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentSession={activeSession}
          onSuccess={() => {
            fetchClassData();
            if (onStatusChanged) onStatusChanged();
          }}
        />
      )}
    </div>
  );
}

