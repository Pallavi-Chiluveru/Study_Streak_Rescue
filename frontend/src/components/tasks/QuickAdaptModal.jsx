import React, { useState } from 'react';
import { Zap, Clock, X } from 'lucide-react';
import ElectricButton from '../ui/ElectricButton';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';

const QuickAdaptModal = ({ planId, isOpen, onClose, onAdaptComplete }) => {
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [customVal, setCustomVal] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleAdapt = async () => {
    setLoading(true);
    const targetMins = customVal ? parseInt(customVal) : selectedMinutes;

    try {
      const res = await API.post(`/plans/${planId}/quick-adapt`, {
        todayAvailableMinutes: targetMins
      });
      addToast(res.data.message || 'Today schedule adapted!', 'electric');
      if (onAdaptComplete) onAdaptComplete();
      onClose();
    } catch (error) {
      console.error('Quick Adapt Error:', error);
      addToast('Failed to adapt schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-orange-500/40 rounded-3xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">⚡ I Have Less Time Today</h3>
            <p className="text-xs text-slate-400">System prioritizes key items & shifts remaining to tomorrow.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[30, 60, 120].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                setSelectedMinutes(mins);
                setCustomVal('');
              }}
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedMinutes === mins && !customVal
                  ? 'bg-orange-600/30 border-orange-400 text-white font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-base font-bold">{mins < 60 ? `${mins}m` : `${mins / 60}h`}</div>
              <div className="text-[10px] text-slate-400">Available</div>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-xs text-slate-400 mb-1">Custom Minutes Today:</label>
          <input
            type="number"
            placeholder="e.g. 45"
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-400"
          />
        </div>

        <div className="flex justify-end gap-2">
          <ElectricButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </ElectricButton>
          <ElectricButton variant="primary" size="sm" onClick={handleAdapt} disabled={loading}>
            {loading ? 'Adapting...' : 'Re-balance Today ⚡'}
          </ElectricButton>
        </div>
      </div>
    </div>
  );
};

export default QuickAdaptModal;
