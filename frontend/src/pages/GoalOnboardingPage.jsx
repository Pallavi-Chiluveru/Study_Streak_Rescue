import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  ArrowLeft,
  ArrowRight,
  Plus,
  Sparkles,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import API from "../services/api";
import { useAuth } from "../context/authContext.js";
import { useToast } from "../context/ToastContext";
import { formatDuration, pluralize } from "../utils/duration";
import ElectricButton from "../components/ui/ElectricButton";
import WeeklyAvailabilityEditor from "../components/goals/WeeklyAvailabilityEditor";
const blank = () => ({
  title: "",
  description: "",
  category: "Skill Development",
  priority: "medium",
  horizon: "medium",
  startDate: "",
  deadline: "",
  weeklyMinutes: "",
  minimumWeeklyMinutes: 0,
  currentProgress: 0,
  cadence: { type: "ai_recommended", timesPerWeek: 3, daysOfWeek: [] },
});
const labels = [
  "Direction",
  "Goals",
  "Availability",
  "Preferences",
  "AI Analysis",
  "Review",
];
const categories = [
  "Competitive Exam",
  "Semester / Academics",
  "Coding / DSA",
  "Interview Preparation",
  "Aptitude",
  "Certification",
  "Project",
  "Career / Resume",
  "Language Learning",
  "Skill Development",
  "Custom",
];
const frequencies = [
  ["ai_recommended", "AI Recommended"],
  ["daily", "Daily"],
  ["weekdays", "Weekdays"],
  ["alternate_days", "Alternate Days"],
  ["times_per_week", "X Times Per Week"],
  ["weekends", "Weekends"],
  ["specific_days", "Specific Days"],
  ["flexible", "Flexible"],
];
const progressStages = [
  ["Not Started", 0],
  ["Just Started", 20],
  ["In Progress", 50],
  ["Almost Done", 80],
];
const weekdays = [
  ["Sun", 0],
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6],
];
const cleanGoalDraft = (goal) => {
  const cleaned = {
    ...blank(),
    ...(goal || {}),
    cadence: { ...blank().cadence, ...(goal?.cadence || {}) },
  };
  delete cleaned.notes;
  delete cleaned.importance;
  return cleaned;
};
const progressValue = (value) =>
  progressStages.reduce(
    (closest, stage) =>
      Math.abs(stage[1] - (Number(value) || 0)) <
      Math.abs(closest[1] - (Number(value) || 0))
        ? stage
        : closest,
    progressStages[0],
  )[1];
const fieldClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const initialDraft = () => ({
  rawDirectionText: "",
  aiSummary: "",
  analysisSourceText: "",
  goals: [blank()],
  availability: [120, 120, 120, 120, 120, 180, 180],
  maximumDailyMinutes: 180,
  preferredSessionMinutes: 45,
  preferredStudyPeriod: "evening",
  utilizationPreference: "balanced",
  restDays: [0],
  removedGoalIds: [],
});
const normalizeDraft = (saved, fallback = initialDraft()) => {
  const value = saved && typeof saved === "object" ? saved : {};
  return {
    ...fallback,
    ...value,
    rawDirectionText:
      value.rawDirectionText ?? value.mainAim ?? fallback.rawDirectionText,
    aiSummary: value.aiSummary ?? "",
    goals: (value.goals || fallback.goals).map(cleanGoalDraft),
  };
};
const planningContextKeyFor = (draft) =>
  JSON.stringify({
    rawDirectionText: draft.rawDirectionText,
    goals: draft.goals.map((goal) => ({
      title: goal.title,
      description: goal.description || "",
      category: goal.category,
      horizon: goal.horizon,
      startDate: goal.startDate || "",
      deadline: goal.deadline || "",
      priority: goal.priority,
      cadence: {
        type: goal.cadence?.type || "ai_recommended",
        timesPerWeek: Number(goal.cadence?.timesPerWeek || 3),
        daysOfWeek: [...(goal.cadence?.daysOfWeek || [])].sort(),
      },
      weeklyMinutes: Number(goal.weeklyMinutes) || 0,
      minimumWeeklyMinutes: Number(goal.minimumWeeklyMinutes) || 0,
      currentProgress: progressValue(goal.currentProgress),
    })),
    availability: draft.availability.map(Number),
    maximumDailyMinutes: Number(draft.maximumDailyMinutes),
    preferredSessionMinutes: Number(draft.preferredSessionMinutes),
    preferredStudyPeriod: draft.preferredStudyPeriod,
    utilizationPreference: draft.utilizationPreference,
    restDays: [...(draft.restDays || [])].sort(),
  });

const GoalDraftCard = ({
  goal,
  index,
  total,
  onUpdate,
  onCadence,
  onRemove,
}) => (
  <article className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-950/30 sm:p-5">
    <header className="mb-4 flex items-center justify-between gap-3">
      <strong className="text-base text-slate-900 dark:text-white">
        Goal {index + 1}
      </strong>
      {total > 1 && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={"Remove goal " + (index + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      )}
    </header>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-2">
        Goal Name
        <input
          required
          value={goal.title}
          onChange={(event) => onUpdate("title", event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="text-sm font-medium">
        Category
        <select
          value={goal.category}
          onChange={(event) => onUpdate("category", event.target.value)}
          className={fieldClass}
        >
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Horizon
        <select
          value={goal.horizon}
          onChange={(event) => onUpdate("horizon", event.target.value)}
          className={fieldClass}
        >
          <option value="short">Short Term</option>
          <option value="medium">Medium Term</option>
          <option value="long">Long Term</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Deadline <span className="font-normal text-slate-500">(Optional)</span>
        <input
          type="date"
          value={goal.deadline || ""}
          onChange={(event) => onUpdate("deadline", event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="text-sm font-medium">
        Priority
        <select
          value={goal.priority}
          onChange={(event) => onUpdate("priority", event.target.value)}
          className={fieldClass}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Preferred Frequency
        <select
          value={goal.cadence?.type || "ai_recommended"}
          onChange={(event) => onCadence("type", event.target.value)}
          className={fieldClass}
        >
          {frequencies.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
    <fieldset className="mt-4">
      <legend className="text-sm font-medium">
        Where are you currently?{" "}
        <span className="font-normal text-slate-500">(Optional)</span>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {progressStages.map(([label, value]) => (
          <button
            key={label}
            type="button"
            aria-pressed={progressValue(goal.currentProgress) === value}
            onClick={() => onUpdate("currentProgress", value)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
              (progressValue(goal.currentProgress) === value
                ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-600 hover:border-orange-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")
            }
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
    <details className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <summary className="cursor-pointer text-sm font-semibold text-slate-600 dark:text-slate-300">
        Advanced preferences
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {goal.cadence?.type === "times_per_week" && (
          <label className="text-sm font-medium">
            Sessions per week
            <input
              type="number"
              min="1"
              max="7"
              value={goal.cadence.timesPerWeek || 3}
              onChange={(event) =>
                onCadence("timesPerWeek", Number(event.target.value))
              }
              className={fieldClass}
            />
          </label>
        )}
        {goal.cadence?.type === "specific_days" && (
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">Specific days</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {weekdays.map(([label, value]) => {
                const selected = goal.cadence.daysOfWeek?.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      onCadence(
                        "daysOfWeek",
                        selected
                          ? goal.cadence.daysOfWeek.filter(
                              (day) => day !== value,
                            )
                          : [...(goal.cadence.daysOfWeek || []), value],
                      )
                    }
                    className={
                      "rounded-lg border px-2.5 py-1.5 text-xs " +
                      (selected
                        ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                        : "border-slate-300 dark:border-slate-700")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        <label className="text-sm font-medium">
          Custom weekly minutes{" "}
          <span className="font-normal text-slate-500">(Optional)</span>
          <input
            type="number"
            min="5"
            max="5040"
            value={goal.weeklyMinutes ?? ""}
            placeholder="Let the planner estimate"
            onChange={(event) => onUpdate("weeklyMinutes", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Minimum weekly commitment{" "}
          <span className="font-normal text-slate-500">(Optional)</span>
          <input
            type="number"
            min="0"
            max="5040"
            value={goal.minimumWeeklyMinutes ?? 0}
            onChange={(event) =>
              onUpdate("minimumWeeklyMinutes", event.target.value)
            }
            className={fieldClass}
          />
        </label>
      </div>
    </details>
  </article>
);
export default function GoalOnboardingPage() {
  const nav = useNavigate(),
    { user, updateUserStats } = useAuth(),
    { addToast } = useToast();
  const [step, setStep] = useState(0),
    [draft, setDraft] = useState(initialDraft),
    [busy, setBusy] = useState(false),
    [storedPreview, setPreview] = useState(null),
    [hydrated, setHydrated] = useState(false);
  const planningContextKey = useMemo(
    () => planningContextKeyFor(draft),
    [draft],
  );
  const planningContextKeyRef = React.useRef(planningContextKey);
  const analysisRequestIdRef = React.useRef(0);
  const currentPreview =
    storedPreview?.analysisContextKey === planningContextKey
      ? storedPreview
      : null;
  const preview = currentPreview;
  const storageKey = useMemo(
    () =>
      `studyStreakGoalOnboardingDraft:${user?._id || user?.id || user?.email || "current"}`,
    [user],
  );
  useEffect(() => {
    let active = true;
    API.get("/goals/profile")
      .then((r) => {
        if (!active) return;
        const o = r.data.goalOnboarding;
        if (o?.status === "in_progress") {
          let local = null;
          try {
            local = JSON.parse(sessionStorage.getItem(storageKey) || "null");
          } catch {
            /* Ignore an invalid local draft. */
          }
          const restored = normalizeDraft(
            local?.draft,
            normalizeDraft(o.draft),
          );
          setStep(Number.isInteger(local?.step) ? local.step : o.step || 1);
          setDraft(restored);
          const restoredPreview = local?.preview || restored.preview || null;
          setPreview(
            restoredPreview?.analysisContextKey ===
              planningContextKeyFor(restored)
              ? restoredPreview
              : null,
          );
        } else sessionStorage.removeItem(storageKey);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [storageKey]);
  useEffect(() => {
    planningContextKeyRef.current = planningContextKey;
    analysisRequestIdRef.current += 1;
  }, [planningContextKey]);
  useEffect(() => {
    if (!hydrated || step === 0) return;
    const snapshot = { step, draft, preview: currentPreview };
    sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    const timer = setTimeout(() => {
      API.patch("/goals/onboarding", {
        status: "in_progress",
        step,
        draft: { ...draft, preview: currentPreview },
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, currentPreview, step, hydrated, storageKey]);
  const persist = async (next, d = draft) => {
    await API.patch("/goals/onboarding", {
      status: "in_progress",
      step: next,
      draft: {
        ...d,
        preview: currentPreview,
      },
    });
    setStep(next);
  };
  const skip = async () => {
    const r = await API.patch("/goals/onboarding", {
      status: "skipped",
      step: 0,
      draft: {},
    });
    sessionStorage.removeItem(storageKey);
    updateUserStats(r.data);
    nav("/dashboard");
  };
  const extract = async () => {
    const rawDirectionText = draft.rawDirectionText;
    if (!rawDirectionText.trim()) return;
    if (
      draft.analysisSourceText === rawDirectionText &&
      draft.goals.some((g) => g.title.trim())
    ) {
      await persist(2);
      return;
    }
    if (
      draft.analysisSourceText &&
      draft.goals.some((g) => g.title.trim()) &&
      !window.confirm(
        "Your description changed. Analyze it again? This will replace the current goal drafts. Choose Cancel to keep your edited goals.",
      )
    ) {
      await persist(2);
      return;
    }
    setBusy(true);
    try {
      const r = await API.post("/goals/extract", {
        directionText: rawDirectionText,
      });
      if (r.data.goals.length) {
        const d = {
          ...draft,
          rawDirectionText,
          aiSummary: r.data.mainAim || "",
          analysisSourceText: rawDirectionText,
          goals: r.data.goals.map(cleanGoalDraft),
          removedGoalIds: [
            ...(draft.removedGoalIds || []),
            ...draft.goals.map((goal) => goal._id).filter(Boolean),
          ],
        };
        setDraft(d);
        await persist(2, d);
      } else addToast(r.data.message || "Add goals manually", "warning");
    } catch (e) {
      addToast(
        e.response?.data?.message ||
          "AI analysis is unavailable; your draft is safe.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveAndReview = async () => {
    const contextKey = planningContextKey;
    const requestId = ++analysisRequestIdRef.current;
    setPreview(null);
    setStep(5);
    setBusy(true);
    try {
      await API.patch("/goals/profile", {
        rawDirectionText: draft.rawDirectionText,
        mainAim: draft.aiSummary || draft.rawDirectionText.slice(0, 2000),
        weeklyAvailability: draft.availability.map(Number),
        maximumDailyMinutes: Number(draft.maximumDailyMinutes),
        preferredSessionMinutes: Number(draft.preferredSessionMinutes),
        preferredStudyPeriod: draft.preferredStudyPeriod,
        utilizationPreference: draft.utilizationPreference,
        restDays: draft.restDays,
      });
      for (const goalId of new Set(draft.removedGoalIds || []))
        await API.patch("/goals/" + goalId + "/status", { status: "archived" });
      const savedGoals = [];
      for (const g of draft.goals.filter((g) => g.title.trim())) {
        const estimatedWeeklyMinutes = Math.max(
          5,
          Number(g.weeklyMinutes) ||
            (g.cadence?.timesPerWeek || 3) *
              Number(draft.preferredSessionMinutes || 45),
        );
        const body = {
          title: g.title,
          description: g.description || "",
          category: g.category,
          horizon: g.horizon,
          deadline: g.deadline || null,
          startDate: g.startDate || null,
          priority: g.priority,
          importance:
            g.priority === "high"
              ? "essential"
              : g.priority === "low"
                ? "flexible"
                : "important",
          cadence: g.cadence || {
            type: "ai_recommended",
            timesPerWeek: 3,
            daysOfWeek: [],
          },
          weeklyMinutes: estimatedWeeklyMinutes,
          minimumWeeklyMinutes: Number(g.minimumWeeklyMinutes) || 0,
          currentProgress: progressValue(g.currentProgress),
        };
        const response = g._id
          ? await API.patch("/goals/" + g._id, body)
          : await API.post("/goals", body);
        savedGoals.push(cleanGoalDraft({ ...g, ...response.data }));
      }
      const p = (await API.post("/goals/schedule/preview", {})).data;
      if (requestId !== analysisRequestIdRef.current) return;
      if (contextKey !== planningContextKeyRef.current) return;
      const taggedPreview = { ...p, analysisContextKey: contextKey };
      const d = { ...draft, goals: savedGoals, removedGoalIds: [] };
      setDraft(d);
      setPreview(taggedPreview);
      await persist(5, d);
    } catch (e) {
      addToast(
        e.response?.data?.message || "Could not prepare the review",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    if (!currentPreview) {
      setPreview(null);
      setStep(4);
      addToast(
        "Your inputs changed. Recheck feasibility before building.",
        "warning",
      );
      return;
    }
    setBusy(true);
    try {
      if (currentPreview?.feasible)
        await API.post("/goals/schedule/" + preview.previewId + "/apply");
      const r = await API.patch("/goals/onboarding", {
        status: "completed",
        step: 6,
        draft: {},
      });
      sessionStorage.removeItem(storageKey);
      updateUserStats(r.data);
      nav("/dashboard");
    } catch (e) {
      addToast(
        e.response?.data?.message || "Could not apply the schedule",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const updateGoal = (i, k, v) =>
    setDraft((d) => ({
      ...d,
      goals: d.goals.map((g, n) => (n === i ? { ...g, [k]: v } : g)),
    }));
  const updateCadence = (i, k, v) =>
    setDraft((d) => ({
      ...d,
      goals: d.goals.map((g, n) =>
        n === i ? { ...g, cadence: { ...g.cadence, [k]: v } } : g,
      ),
    }));
  const removeGoal = (i) =>
    setDraft((d) => ({
      ...d,
      goals: d.goals.filter((_, n) => n !== i),
      removedGoalIds: d.goals[i]?._id
        ? [...(d.removedGoalIds || []), d.goals[i]._id]
        : d.removedGoalIds || [],
    }));
  return (
    <div className="mx-auto max-w-5xl pb-20">
      <div
        className="mb-5 flex gap-1"
        aria-label={"Step " + (step + 1) + " of 6"}
      >
        {labels.map((x, i) => (
          <div key={x} className="flex-1">
            <div
              className={
                "h-1.5 rounded-full " +
                (i <= step ? "bg-orange-500" : "bg-slate-200 dark:bg-slate-800")
              }
            />
            <span className="mt-1 hidden text-xs sm:block">{x}</span>
          </div>
        ))}
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-9">
        {step === 0 && (
          <div className="py-8 text-center">
            <Target className="mx-auto h-12 w-12 text-orange-500" />
            <p className="mt-5 text-sm font-bold text-orange-600">
              Welcome to Study Streak Rescue
            </p>
            <h1 className="mt-2 text-3xl font-black">
              Let's organize your goals
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
              You're probably working toward more than one thing. Add your
              short-, medium-, and long-term goals and we'll turn them into one
              realistic schedule.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ElectricButton icon={Target} onClick={() => persist(1)}>
                Set Up My Goals
              </ElectricButton>
              <ElectricButton variant="secondary" onClick={skip}>
                Skip for Now
              </ElectricButton>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-bold text-orange-600">Your Direction</p>
            <h1 className="mt-1 text-3xl font-black">
              What's your main focus right now?
            </h1>
            <p
              id="direction-help"
              className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400"
            >
              Tell us what you're working toward, including any exams, skills,
              projects, academic goals, or career goals.
            </p>
            <label className="mt-6 block">
              <span className="sr-only">Your current goals and direction</span>
              <textarea
                aria-describedby="direction-help"
                value={draft.rawDirectionText}
                onChange={(e) =>
                  setDraft({ ...draft, rawDirectionText: e.target.value })
                }
                placeholder="I'm preparing for an exam, improving my technical skills, managing academics, and working toward career goals..."
                className="min-h-44 w-full resize-y rounded-2xl border border-slate-300 bg-white p-4 text-base leading-7 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/15"
              />
            </label>
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>
                {busy
                  ? "Organizing your goals..."
                  : "AI can turn this into structured goals"}
              </span>
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <p className="text-sm font-bold text-orange-600">Your Goals</p>
            <h1 className="text-3xl font-black">Review what AI understood</h1>
            <p className="mt-2 text-slate-500">
              These are editable drafts. Confirm the essentials and adjust only
              what needs changing.
            </p>
            <div className="mt-5 space-y-4">
              {draft.goals.map((goal, index) => (
                <GoalDraftCard
                  key={index}
                  goal={cleanGoalDraft(goal)}
                  index={index}
                  total={draft.goals.length}
                  onUpdate={(key, value) => updateGoal(index, key, value)}
                  onCadence={(key, value) => updateCadence(index, key, value)}
                  onRemove={() => removeGoal(index)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft({ ...draft, goals: [...draft.goals, blank()] })
              }
              className="mt-4 flex h-11 items-center gap-2 font-bold text-orange-600"
            >
              <Plus className="h-4 w-4" />
              Add Another Goal
            </button>
          </div>
        )}
        {step === 3 && (
          <div>
            <p className="text-sm font-bold text-orange-600">
              Weekly Availability
            </p>
            <h1 className="text-3xl font-black">
              How much time is genuinely available?
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Tell us how much focused study time you can realistically give
              each day.
            </p>
            <WeeklyAvailabilityEditor
              value={draft.availability}
              onChange={(availability) => setDraft({ ...draft, availability })}
            />
          </div>
        )}
        {step === 4 && (
          <div>
            <p className="text-sm font-bold text-orange-600">Preferences</p>
            <h1 className="text-3xl font-black">Protect your energy</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="font-semibold">
                Maximum planned time/day
                <input
                  type="number"
                  min="15"
                  max="720"
                  value={draft.maximumDailyMinutes}
                  onChange={(e) =>
                    setDraft({ ...draft, maximumDailyMinutes: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border p-3"
                />
              </label>
              <label className="font-semibold">
                Session length
                <select
                  value={draft.preferredSessionMinutes}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      preferredSessionMinutes: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border p-3"
                >
                  {[25, 45, 60, 90].map((x) => (
                    <option key={x} value={x}>
                      {x} minutes
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Preferred study time
                <select
                  value={draft.preferredStudyPeriod}
                  onChange={(e) =>
                    setDraft({ ...draft, preferredStudyPeriod: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border p-3"
                >
                  {[
                    "morning",
                    "afternoon",
                    "evening",
                    "late_evening",
                    "none",
                  ].map((x) => (
                    <option key={x} value={x}>
                      {x.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Buffer
                <select
                  value={draft.utilizationPreference}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      utilizationPreference: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border p-3"
                >
                  <option value="light">Light buffer (75%)</option>
                  <option value="balanced">Balanced (85%)</option>
                  <option value="maximum">Maximum utilization</option>
                </select>
              </label>
            </div>
          </div>
        )}
        {step === 5 && (
          <div>
            <p className="text-sm font-bold text-orange-600">
              Review Your Plan
            </p>
            <h1 className="text-3xl font-black">
              {preview?.reality ||
                (busy ? "Updating your plan..." : "Plan needs recalculation")}
            </h1>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Capacity", preview?.availableMinutes],
                ["Planned", preview?.plannedMinutes],
                ["Buffer", preview?.bufferMinutes],
                ["Shortage", preview?.shortageMinutes],
              ].map(([l, v]) => (
                <div
                  className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"
                  key={l}
                >
                  <p className="text-sm text-slate-500">{l}</p>
                  <strong className="text-xl">{formatDuration(v || 0)}</strong>
                </div>
              ))}
            </div>
            {preview?.duplicates?.map((duplicate) => (
              <div key={duplicate.goalIds.join("-")} className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                <strong>Possible duplicate goals</strong>
                <p>{duplicate.titles.join(" and ")}</p>
                <p>{duplicate.message} Go back and keep or merge one goal before building the schedule.</p>
              </div>
            ))}
            {preview && !preview.feasible && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-300">
                This portfolio needs review. Nothing will be overbooked. Return to adjust goals or availability.
              </div>
            )}
            {preview?.strategies?.map((s) => (
              <div key={s.goalId} className="mt-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <strong className="block">{s.title}</strong>
                    <span className="text-sm capitalize text-slate-500">{s.priority} priority · {s.horizon} term · {s.complexity}</span>
                  </div>
                  <strong>{pluralize(s.sessions, "session")} · {formatDuration(s.minutes)}/week</strong>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300"><strong>Why this allocation:</strong> {s.reason}</p>
              </div>
            ))}
            {preview?.validation?.checks?.length > 0 && (
              <div className="mt-5 rounded-xl border p-4">
                <strong>Planning validation</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  {preview.validation.checks.map((check) => <li key={check.key}>{check.passed ? "?" : "?"} {check.message}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        {step > 0 && (
          <footer className="mt-8 flex justify-between border-t pt-5">
            <ElectricButton
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => persist(step - 1)}
            >
              Back
            </ElectricButton>
            {step < 4 ? (
              <ElectricButton
                icon={ArrowRight}
                disabled={
                  step === 1 && (busy || !draft.rawDirectionText.trim())
                }
                onClick={step === 1 ? extract : () => persist(step + 1)}
              >
                {step === 1 && busy ? "Organizing..." : "Continue"}
              </ElectricButton>
            ) : step === 4 ? (
              <ElectricButton
                icon={Sparkles}
                disabled={busy || !draft.goals.some((g) => g.title.trim())}
                onClick={saveAndReview}
              >
                {busy ? "Checking capacity..." : "Review My Plan"}
              </ElectricButton>
            ) : (
              <ElectricButton
                icon={CheckCircle2}
                disabled={busy || (preview ? !preview.feasible : false)}
                onClick={preview ? apply : saveAndReview}
              >
                {preview ? "Build My Schedule" : "Recheck Feasibility"}
              </ElectricButton>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}
