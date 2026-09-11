import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Check, ArrowRight, ArrowLeft, Sparkles, AlertTriangle, ShieldCheck, Clock, Calendar, Tag, Plus } from 'lucide-react';
import ElectricButton from '../ui/ElectricButton';
import ElectricCard from '../ui/ElectricCard';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';

const CreatePlanWizard = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('Understanding your goal...');

  // Form Fields State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Interview Preparation');
  const [description, setDescription] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState(['Java OOP', 'Collections', 'Multithreading', 'SQL', 'REST APIs']);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Default deadline 6 days from today
  const defaultDeadline = new Date();
  defaultDeadline.setDate(defaultDeadline.getDate() + 6);
  const [deadline, setDeadline] = useState(defaultDeadline.toISOString().split('T')[0]);

  const [availableHours, setAvailableHours] = useState('3');
  const [sessionLength, setSessionLength] = useState('45');
  const [difficulty, setDifficulty] = useState('medium');
  const [priority, setPriority] = useState('high');

  // Preview data returned from /api/plans/generate
  const [previewData, setPreviewData] = useState(null);

  const categories = [
    'Academic', 'Coding', 'Interview Preparation', 'Certification',
    'Competitive Exam', 'Language Learning', 'Online Course', 'Project',
    'Research', 'Skill Learning', 'Custom'
  ];

  const handleAddTopic = () => {
    if (topicInput.trim() && !topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (tToRemove) => {
    setTopics(topics.filter(t => t !== tToRemove));
  };

  const handleGeneratePreview = async () => {
    if (!title) {
      addToast('Please enter a goal title', 'warning');
      return;
    }

    setStep(5); // AI loader screen
    setLoading(true);

    const messages = [
      'Understanding your goal...',
      'Breaking the goal into micro-tasks...',
      'Calculating workload...',
      'Checking your deadline...',
      'Building your schedule...'
    ];

    for (let i = 0; i < messages.length; i++) {
      setLoaderMessage(messages[i]);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const res = await API.post('/plans/generate', {
        title,
        description,
        category,
        topics,
        startDate,
        deadline,
        availableMinutesPerDay: parseFloat(availableHours) * 60,
        sessionLength: parseInt(sessionLength),
        difficulty,
        priority
      });

      setPreviewData(res.data);
      setStep(4); // Review screen
    } catch (error) {
      console.error('Generation Error:', error);
      addToast(error.response?.data?.message || 'Failed to generate breakdown', 'error');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!previewData) return;
    setLoading(true);

    try {
      const res = await API.post('/plans', {
        title,
        category,
        description,
        topics,
        startDate,
        deadline,
        availableMinutesPerDay: parseFloat(availableHours) * 60,
        sessionLength: parseInt(sessionLength),
        difficulty,
        priority,
        tasks: previewData.breakdown.tasks
      });

      addToast('✅ Plan created successfully! ⚡', 'success');
      navigate(`/plans/${res.data.plan._id}`);
    } catch (error) {
      console.error('Save Plan Error:', error);
      addToast('Failed to save plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Wizard Header Progress Bar */}
      {step !== 5 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {['01 Goal', '02 Topics', '03 Availability', '04 Review'].map((label, idx) => {
              const stepNum = idx + 1;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 text-xs font-semibold ${step === stepNum
                    ? 'text-orange-400'
                    : step > stepNum
                      ? 'text-emerald-400'
                      : 'text-slate-600'
                    }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${step === stepNum
                      ? 'bg-orange-600/30 border-orange-400 text-white shadow-lg shadow-orange-900/40'
                      : step > stepNum
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                        : 'border-slate-800 bg-slate-900 text-slate-600'
                      }`}
                  >
                    {step > stepNum ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              );
            })}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 1: GOAL DETAILS */}
      {step === 1 && (
        <ElectricCard className="space-y-6">
          <div>
            <span className="text-xs uppercase tracking-wider text-orange-400 font-mono font-semibold">
              Step 01 of 04
            </span>
            <h2 className="text-2xl font-extrabold text-white">What is your learning goal?</h2>
            <p className="text-xs text-slate-400 mt-1">Study Streak Rescue works for ANY goal, exam, project, or skill.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Goal Title *</label>
            <input
              type="text"
              placeholder="e.g. Java Backend Interview Preparation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${category === cat
                    ? 'bg-orange-600/30 border-orange-400 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Description (Optional)</label>
            <textarea
              rows="3"
              placeholder="Add key context, target outcome, or specific expectations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-400 text-sm"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
            <ElectricButton variant="primary" size="md" icon={null} onClick={() => setStep(2)} className="h-11 px-5 text-sm">
              <span>Next: Add Topics</span> <ArrowRight className="h-4 w-4" />
            </ElectricButton>
          </div>
        </ElectricCard>
      )}

      {/* STEP 2: TOPICS & MATERIAL */}
      {step === 2 && (
        <ElectricCard className="space-y-6">
          <div>
            <span className="text-xs uppercase tracking-wider text-orange-400 font-mono font-semibold">
              Step 02 of 04
            </span>
            <h2 className="text-2xl font-extrabold text-white">Specify Topics or Material</h2>
            <p className="text-xs text-slate-400 mt-1">Add key modules or topics for AI micro-breakdown.</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type topic (e.g. Spring Boot REST APIs)..."
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-400 text-sm"
            />
            <ElectricButton variant="secondary" icon={Plus} onClick={handleAddTopic}>
              Add Topic
            </ElectricButton>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[80px] p-4 rounded-xl bg-slate-950 border border-slate-800">
            {topics.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No topics added yet. AI will infer standard topics from title.</span>
            ) : (
              topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-950/50 border border-orange-500/40 text-orange-200 text-xs font-medium"
                >
                  <Tag className="w-3 h-3 text-orange-400" />
                  {t}
                  <button
                    onClick={() => handleRemoveTopic(t)}
                    className="ml-1 text-slate-400 hover:text-red-400 text-sm font-bold"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <ElectricButton variant="secondary" size="md" icon={null} onClick={() => setStep(1)} className="h-11 px-5 text-sm">
              <ArrowLeft className="h-4 w-4" /> <span>Back</span>
            </ElectricButton>
            <ElectricButton variant="primary" size="md" icon={null} onClick={() => setStep(3)} className="h-11 px-5 text-sm">
              <span>Next: Availability</span> <ArrowRight className="h-4 w-4" />
            </ElectricButton>
          </div>
        </ElectricCard>
      )}

      {/* STEP 3: AVAILABILITY & PREFERENCES */}
      {step === 3 && (
        <ElectricCard className="space-y-6">
          <div>
            <span className="text-xs uppercase tracking-wider text-orange-400 font-mono font-semibold">
              Step 03 of 04
            </span>
            <h2 className="text-2xl font-extrabold text-white">Your Availability & Pace</h2>
            <p className="text-xs text-slate-400 mt-1">Set realistic timeline parameters.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Target Deadline *</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Available Hours Per Day *</label>
              <select
                value={availableHours}
                onChange={(e) => setAvailableHours(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-400"
              >
                <option value="1">1 hour / day</option>
                <option value="2">2 hours / day</option>
                <option value="3">3 hours / day</option>
                <option value="4">4 hours / day</option>
                <option value="6">6 hours / day</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Session Length</label>
              <div className="flex gap-2">
                {['30', '45', '60'].map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setSessionLength(len)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${sessionLength === len
                      ? 'bg-orange-600/30 border-orange-400 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                  >
                    {len} mins
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <ElectricButton variant="secondary" size="md" icon={null} onClick={() => setStep(2)} className="h-11 px-5 text-sm">
              <ArrowLeft className="h-4 w-4" /> <span>Back</span>
            </ElectricButton>
            <ElectricButton variant="primary" size="md" icon={null} onClick={handleGeneratePreview} className="h-11 px-5 text-sm whitespace-nowrap">
              <span>Generate Plan</span> <ArrowRight className="h-4 w-4" />
            </ElectricButton>
          </div>
        </ElectricCard>
      )}

      {/* STEP 4: REVIEW & FEASIBILITY ENGINE CHECK */}
      {step === 4 && previewData && (
        <div className="space-y-6">
          {/* Feasibility Check Banner */}
          <div
            className={`p-6 rounded-2xl border backdrop-blur-md ${previewData.feasibility.isFeasible
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200 animate-border-flow'
              : 'bg-amber-950/30 border-amber-500/50 text-amber-200 animate-rescue-pulse'
              }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {previewData.feasibility.isFeasible ? (
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-amber-400 animate-bounce" />
              )}
              <h3 className="text-xl font-bold text-white">
                {previewData.feasibility.statusMessage}
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block">Estimated Work:</span>
                <span className="text-sm font-bold text-white">{previewData.feasibility.estimatedHours} Hours</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block">Available Time:</span>
                <span className="text-sm font-bold text-orange-400">{previewData.feasibility.availableHours} Hours</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block">Timeline:</span>
                <span className="text-sm font-bold text-orange-300">{previewData.feasibility.availableDays} Days</span>
              </div>
            </div>

            {!previewData.feasibility.isFeasible && (
              <div className="mt-3 text-xs text-amber-300">
                Options: Consider extending deadline or increasing daily study hours. You can still save and use ⚡ Rescue My Plan whenever needed.
              </div>
            )}
          </div>

          {/* Generated Micro-tasks breakdown list */}
          <ElectricCard>
            <h3 className="text-lg font-bold text-white mb-3">
              Generated Micro-tasks ({previewData.breakdown.tasks.length} Items)
            </h3>
            <p className="text-xs text-slate-400 mb-4">{previewData.breakdown.goalSummary}</p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {previewData.breakdown.tasks.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-mono text-[10px] flex items-center justify-center border border-orange-500/30">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-white">{t.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{t.description}</p>
                    </div>
                  </div>
                  <div className="text-slate-400 font-mono text-right flex-shrink-0">
                    <div>{t.estimatedMinutes} mins</div>
                    <div className="text-[10px] text-orange-400 uppercase">{t.priority}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <ElectricButton variant="secondary" size="md" icon={null} onClick={() => setStep(3)} className="h-11 px-5 text-sm">
                <ArrowLeft className="h-4 w-4" /> <span>Edit Parameters</span>
              </ElectricButton>
              <ElectricButton variant="primary" size="md" icon={null} onClick={handleSavePlan} disabled={loading} className="h-11 px-5 text-sm whitespace-nowrap">
                <span>{loading ? 'Saving Schedule...' : 'Save & Launch Schedule'}</span> <ArrowRight className="h-4 w-4" />
              </ElectricButton>
            </div>
          </ElectricCard>
        </div>
      )}

      {/* STEP 5: AI ENERGY GENERATION LOADER */}
      {step === 5 && (
        <div className="py-20 text-center">
          <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-600 via-orange-400 to-orange-600 animate-spin blur-md opacity-80" />
            <div className="relative w-28 h-28 rounded-full bg-slate-950 border-2 border-orange-400 flex items-center justify-center shadow-2xl">
              <Zap className="w-14 h-14 text-orange-400 animate-lightning" />
            </div>
          </div>

          <h3 className="text-2xl font-black text-white tracking-wide mb-2">
            AI PLANNING ENGINE ACTIVE
          </h3>
          <p className="text-sm text-orange-300 font-mono font-medium tracking-wide animate-pulse">
            {loaderMessage}
          </p>
        </div>
      )}
    </div>
  );
};

export default CreatePlanWizard;
