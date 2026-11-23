import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import { ArrowRight, AlertTriangle, CheckCircle2, X, Building, Users, Sparkles, RefreshCw } from 'lucide-react';

const COMMON_REASONS = [
  "4K Projector Failure / Display Issue",
  "Air Conditioning Not Working / Overheating",
  "Classroom Overcrowding / Need More Seats",
  "Smartboard Malfunction",
  "Administrative Relocation Request"
];

export default function ChangeClassroomModal({ isOpen, onClose, currentSession, onSuccess }) {
  const [vacantRooms, setVacantRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingRooms, setFetchingRooms] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setFetchingRooms(true);
      api.get('/occupancy/vacant')
        .then(res => {
          // Filter out current room
          const available = res.data.filter(r => r.room_id !== currentSession?.room_id);
          setVacantRooms(available);
          if (available.length > 0) {
            setSelectedRoomId(available[0].room_id);
          }
        })
        .catch(err => {
          console.error("Failed to load vacant rooms", err);
          setError("Could not load available destination rooms.");
        })
        .finally(() => setFetchingRooms(false));
    }
  }, [isOpen, currentSession]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setError("Please select a destination room.");
      return;
    }

    const finalReason = reason === 'Other' ? customReason : (reason || "Relocation during active class");
    if (!finalReason.trim()) {
      setError("Please specify a reason for the classroom transfer.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/classes/change-room', {
        current_room_id: currentSession.room_id,
        destination_room_id: parseInt(selectedRoomId),
        booking_id: currentSession.booking_id,
        reason: finalReason
      });

      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to transfer classroom. Please try another room.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedRoom = vacantRooms.find(r => r.room_id === parseInt(selectedRoomId));

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-navy to-[#113a60] p-6 text-white flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-teal text-[#030b14] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" /> Live Transfer
              </span>
              <span className="text-blue-100 text-xs font-medium">Atomic Operation</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Change Classroom / Move Class</h2>
            <p className="text-blue-100/80 text-sm mt-1">
              Relocate your active class seamlessly. Notifications will be sent automatically.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Class Overview */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Room</p>
              <p className="text-xl font-extrabold text-slate-900">{currentSession?.room_number || `Room ID ${currentSession?.room_id}`}</p>
            </div>
            <ArrowRight size={24} className="text-brand-teal mx-2" />
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destination</p>
              <p className="text-xl font-extrabold text-brand-teal">
                {selectedRoom ? selectedRoom.room_number : 'Select Below'}
              </p>
            </div>
          </div>

          {/* Destination Room Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Select Vacant Destination Room ({vacantRooms.length} available)
            </label>
            {fetchingRooms ? (
              <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">
                Checking live vacant rooms...
              </div>
            ) : vacantRooms.length === 0 ? (
              <div className="p-4 text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                No vacant rooms are currently available for transfer.
              </div>
            ) : (
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-800 font-semibold rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-brand-teal"
                required
              >
                {vacantRooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.room_number} — {r.building_name} (Floor {r.floor}, {r.capacity} Seats, {r.room_type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Room Details Preview */}
          {selectedRoom && (
            <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl text-xs flex flex-wrap gap-4 text-slate-700">
              <span className="flex items-center gap-1 font-semibold text-brand-navy">
                <Building size={14} className="text-brand-teal" /> {selectedRoom.building_name} (Floor {selectedRoom.floor})
              </span>
              <span className="flex items-center gap-1 font-semibold text-brand-navy">
                <Users size={14} className="text-brand-teal" /> {selectedRoom.capacity} seats capacity
              </span>
              {selectedRoom.facilities?.length > 0 && (
                <span className="text-slate-600">
                  Facilities: {selectedRoom.facilities.map(f => f.name).join(', ')}
                </span>
              )}
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Reason for Classroom Transfer
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-teal mb-2"
            >
              <option value="">-- Choose a standard reason --</option>
              {COMMON_REASONS.map((r, idx) => (
                <option key={idx} value={r}>{r}</option>
              ))}
              <option value="Other">Other / Custom Reason</option>
            </select>

            {reason === 'Other' && (
              <input
                type="text"
                placeholder="Enter specific reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-teal text-sm"
                required
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || vacantRooms.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? 'Processing Transfer...' : 'Confirm Room Transfer'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

