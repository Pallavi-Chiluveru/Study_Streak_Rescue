import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Zap, Trash2 } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import ElectricCard from '../components/ui/ElectricCard';
import ElectricButton from '../components/ui/ElectricButton';
import PlanHealth from '../components/ui/PlanHealth';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';

const PlansPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed, at_risk
  const [deletePlanId, setDeletePlanId] = useState(null);

  const fetchPlans = async () => {
    try {
      const res = await API.get('/plans');
      setPlans(res.data);
    } catch (error) {
      console.error('Fetch plans error:', error);
      addToast('Failed to load study plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    try {
      await API.delete(`/plans/${deletePlanId}`);
      addToast('Plan deleted successfully', 'info');
      setDeletePlanId(null);
      fetchPlans();
    } catch (error) {
      console.error('Delete plan error:', error);
      addToast('Failed to delete plan', 'error');
    }
  };

  const filteredPlans = plans.filter(p => {
    if (filter === 'active') return p.status === 'active';
    if (filter === 'completed') return p.status === 'completed';
    if (filter === 'at_risk') return p.healthScore < 50 || p.status === 'at_risk';
    return true;
  });

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Zap className="w-10 h-10 text-orange-400 animate-lightning mx-auto mb-3" />
        <p className="font-mono text-xs">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">My Study Plans</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">Manage your adaptive learning goals and catch-up schedules.</p>
        </div>
        <ElectricButton variant="primary" onClick={() => navigate('/plans/new')} icon={Plus}>
          Create New Plan
        </ElectricButton>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-800 pb-3">
        {[
          { key: 'all', label: 'All Plans' },
          { key: 'active', label: 'Active' },
          { key: 'at_risk', label: '⚠ At Risk / Rescue' },
          { key: 'completed', label: 'Completed' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === tab.key
                ? 'bg-orange-50 dark:bg-orange-600/30 border border-orange-200 dark:border-orange-400 text-orange-700 dark:text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-400 hover:text-orange-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Plan Cards Grid */}
      {filteredPlans.length === 0 ? (
        <EmptyState
          title="No Plans Found"
          description={filter === 'all' ? "Ready to start your momentum? Create your first self-healing plan." : `No plans matching filter '${filter}'.`}
          actionLabel="Create Plan"
          onAction={() => navigate('/plans/new')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <ElectricCard
              key={plan._id}
              rescueAlert={plan.healthScore < 50}
              onClick={() => navigate(`/plans/${plan._id}`)}
              className="space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider">
                    {plan.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <PlanHealth score={plan.healthScore} compact />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePlanId(plan._id);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{plan.title}</h3>
                {plan.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{plan.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-mono mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Deadline: {new Date(plan.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-400 font-medium">
                    <span>Progress</span>
                    <span className="text-slate-900 dark:text-white font-bold">{plan.progressPct || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500"
                      style={{ width: `${plan.progressPct || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  {plan.completedCount || 0} / {plan.totalCount || 0} Tasks Done
                </span>
                <span className="text-xs font-bold text-orange-400 group-hover:translate-x-1 transition-transform">
                  View Schedule →
                </span>
              </div>
            </ElectricCard>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletePlanId}
        title="Delete Study Plan?"
        message="This will permanently delete the plan and all associated tasks."
        confirmLabel="Delete Plan"
        onConfirm={handleDeletePlan}
        onCancel={() => setDeletePlanId(null)}
      />
    </div>
  );
};

export default PlansPage;
