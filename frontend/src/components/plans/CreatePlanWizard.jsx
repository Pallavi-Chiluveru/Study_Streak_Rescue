import { getEffectiveEstimatedMinutes } from '../../utils/taskEstimates';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Check, ArrowRight, ArrowLeft, Sparkles, AlertTriangle, ShieldCheck, Tag, Plus, X, LoaderCircle } from 'lucide-react';
import ElectricButton from '../ui/ElectricButton';
import ElectricCard from '../ui/ElectricCard';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { addCalendarDays, formatDateKey } from '../../utils/dateUtils';

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
  const [topics, setTopics] = useState([]);
  const [suggestedTopics, setSuggestedTopics] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [suggestionContextKey, setSuggestionContextKey] = useState('');
  const [startDate, setStartDate] = useState(formatDateKey(new Date()));

  // Default deadline 6 days from today
  const [deadline, setDeadline] = useState(formatDateKey(addCalendarDays(new Date(), 6)));

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

  const normalizeTopic = (value) => String(value || '').trim().replace(/\s+/g, ' ');
  const hasTopic = (items, value) => {
    const key = normalizeTopic(value).toLocaleLowerCase();
    return items.some(item => item.toLocaleLowerCase() === key);
  };

  const addTopic = (value) => {
    const topic = normalizeTopic(value);
    if (!topic || topics.length >= 20 || hasTopic(topics, topic)) return;
    setTopics(current => [...current, topic]);
    setTopicInput('');
  };

  const handleAddTopic = () => addTopic(topicInput);
  const addAllSuggestions = () => {
    setTopics(current => {
      const next = [...current];
      for (const suggestion of suggestedTopics) {
        if (next.length >= 20) break;
        if (!hasTopic(next, suggestion)) next.push(normalizeTopic(suggestion));
      }
      return next;
    });
  };
  const handleRemoveTopic = (topicToRemove) => {
    setTopics(current => current.filter(topic => topic !== topicToRemove));
  };

  const goToTopics = () => {
    if (!title.trim()) {
      addToast('Please enter a goal title', 'warning');
      return;
    }
    setStep(2);
  };

  const currentSuggestionContext = JSON.stringify({
    goalTitle: title.trim(),
    category: category.trim(),
    description: description.trim()
  });

  useEffect(() => {
    if (step !== 2 || !title.trim() || suggestionContextKey === currentSuggestionContext) return;
    let active = true;
    setSuggestedTopics([]);
    setSuggestionsError('');
    setSuggestionsLoading(true);

    API.post('/plans/suggest-topics', JSON.parse(currentSuggestionContext))
      .then(response => {
        if (active) setSuggestedTopics(Array.isArray(response.data.suggestedTopics) ? response.data.suggestedTopics : []);
      })
      .catch(() => {
        if (active) setSuggestionsError("We couldn't generate suggestions right now. You can still add topics manually.");
      })
      .finally(() => {
        if (active) {
          setSuggestionContextKey(currentSuggestionContext);
          setSuggestionsLoading(false);
        }
      });

    return () => { active = false; };
  }, [step, title, currentSuggestionContext, suggestionContextKey]);
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
    <div className="workflow-surface max-w-4xl mx-auto py-6 px-4">
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
            <ElectricButton variant="primary" size="md" icon={null} onClick={goToTopics} className="h-11 px-5 text-sm whitespace-nowrap">
              <span>Next: Add Topics</span> <ArrowRight className="h-4 w-4 shrink-0" />
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

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Type a topic..."
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
              className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-orange-400 focus:outline-none"
            />
            <ElectricButton variant="secondary" icon={Plus} onClick={handleAddTopic} disabled={topics.length >= 20}>
              Add Topic
            </ElectricButton>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Suggested for your goal</h3>
                <p className="mt-0.5 text-xs text-slate-500">{title} <span aria-hidden="true">·</span> {category}</p>
              </div>
              {!suggestionsLoading && suggestedTopics.some(topic => !hasTopic(topics, topic)) && (
                <button type="button" onClick={addAllSuggestions} className="text-xs font-semibold text-orange-400 transition hover:text-orange-300">
                  Add All Suggestions
                </button>
              )}
            </div>
            {suggestionsLoading ? (
              <div className="flex items-center gap-2 text-sm text-orange-300">
                <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                <span>Finding topics for &quot;{title}&quot;...</span>
              </div>
            ) : suggestionsError ? (
              <p className="text-sm text-amber-300">{suggestionsError}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.filter(topic => !hasTopic(topics, topic)).map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => addTopic(topic)}
                    disabled={topics.length >= 20}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-orange-400 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Your Topics</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{topics.length}/20</span>
            </div>
            <div className="flex min-h-[96px] flex-wrap content-start gap-2.5 rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 shadow-inner shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/20">
              {topics.length === 0 ? (
                <span className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">No topics selected yet. Add your own or choose a suggestion.</span>
              ) : topics.map(topic => (
                <span
                  key={topic}
                  className="inline-flex h-fit max-w-full items-center gap-2.5 rounded-full border-2 border-orange-400 bg-orange-100 px-4 py-2 text-sm font-semibold leading-5 text-orange-950 shadow-sm shadow-orange-200/60 transition duration-150 hover:-translate-y-0.5 hover:border-orange-500 hover:shadow-md active:translate-y-0 dark:border-orange-400/80 dark:bg-orange-500/30 dark:text-orange-50 dark:shadow-orange-950/30 dark:hover:border-orange-300"
                >
                  <Tag className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" aria-hidden="true" />
                  <span className="min-w-0 break-words">{topic}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(topic)}
                    aria-label={'Remove ' + topic}
                    className="ml-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-orange-700 transition hover:bg-red-100 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-95 dark:text-orange-100 dark:hover:bg-red-500/25 dark:hover:text-red-100 dark:focus-visible:ring-offset-slate-950"
                  >
                    <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <ElectricButton variant="secondary" size="md" icon={null} onClick={() => setStep(1)} className="h-11 px-5 text-sm whitespace-nowrap">
              <ArrowLeft className="h-4 w-4 shrink-0" /> <span>Back</span>
            </ElectricButton>
            <ElectricButton variant="primary" size="md" icon={null} onClick={() => setStep(3)} className="h-11 px-5 text-sm whitespace-nowrap">
              <span>Next: Availability</span> <ArrowRight className="h-4 w-4 shrink-0" />
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
            <ElectricButton variant="secondary" size="md" icon={null} onClick={goToTopics} className="h-11 px-5 text-sm whitespace-nowrap">
              <ArrowLeft className="h-4 w-4 shrink-0" /> <span>Back</span>
            </ElectricButton>
            <ElectricButton variant="primary" size="md" icon={null} onClick={handleGeneratePreview} className="h-11 px-5 text-sm whitespace-nowrap">
              <span>Next: Review</span> <ArrowRight className="h-4 w-4 shrink-0" />
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
                    <div>{getEffectiveEstimatedMinutes(t)} mins</div>
                    <div className="text-[10px] text-orange-400 uppercase">{t.priority}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <ElectricButton variant="secondary" size="md" icon={null} onClick={() => setStep(3)} className="h-11 px-5 text-sm whitespace-nowrap">
                <ArrowLeft className="h-4 w-4 shrink-0" /> <span>Back</span>
              </ElectricButton>
              <ElectricButton variant="primary" size="md" icon={null} onClick={handleSavePlan} disabled={loading} className="h-11 px-5 text-sm whitespace-nowrap">
                <span>{loading ? 'Creating Plan...' : 'Create My Plan'}</span> <ArrowRight className="h-4 w-4 shrink-0" />
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
