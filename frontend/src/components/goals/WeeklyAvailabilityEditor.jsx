import React, { useState } from 'react';
import { CalendarDays, Copy, SlidersHorizontal } from 'lucide-react';
import { combineDuration, formatDuration, normalizeMinutes, splitDuration } from '../../utils/duration';

const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const presets=[30,60,90,120,180];

const DurationFields=({label,total,onChange,disabled=false})=>{
 const value=splitDuration(total);
 return <div className="grid grid-cols-2 gap-2">
  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200"><span className="sr-only">{label} </span>Hours
   <div className="relative mt-1"><input aria-label={label+' hours'} type="number" inputMode="numeric" min="0" max="24" step="1" disabled={disabled} value={value.hours} onChange={e=>onChange(combineDuration(e.target.value,value.minutes))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-10 text-base font-semibold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">hrs</span></div>
  </label>
  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200"><span className="sr-only">{label} </span>Minutes
   <div className="relative mt-1"><input aria-label={label+' minutes'} type="number" inputMode="numeric" min="0" max="59" step="1" disabled={disabled} value={value.minutes} onChange={e=>onChange(combineDuration(value.hours,e.target.value))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-10 text-base font-semibold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">min</span></div>
  </label>
 </div>;
};

const DayCard=({day,index,total,onChange,copyWeekdays,copyAll})=>{
 const unavailable=normalizeMinutes(total)===0;
 return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus-within:border-orange-300 dark:border-slate-700 dark:bg-slate-900">
  <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-bold text-slate-900 dark:text-white">{day}</h3><label className="flex items-center gap-1.5 text-sm text-slate-500"><input type="checkbox" checked={unavailable} onChange={e=>e.target.checked?onChange(0):onChange(60)} className="accent-orange-500"/>Unavailable</label></div>
  <DurationFields label={day} total={total} onChange={onChange} disabled={unavailable}/>
  <div className="mt-3 flex flex-wrap gap-1.5" aria-label={day+' quick presets'}>{presets.map(p=><button type="button" key={p} onClick={()=>onChange(p)} className={'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition '+(total===p?'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300':'border-slate-200 text-slate-600 hover:border-orange-300 dark:border-slate-700 dark:text-slate-300')}>{formatDuration(p)}</button>)}</div>
  <div className="mt-3 flex items-center justify-between gap-2"><span className={'text-sm font-semibold '+(unavailable?'text-slate-500':'text-orange-600 dark:text-orange-300')}>{unavailable?'Rest / unavailable':'Total: '+formatDuration(total)}</span><div className="flex gap-2">{index===0&&<button type="button" onClick={copyWeekdays} className="text-xs font-semibold text-slate-500 hover:text-orange-600"><Copy className="mr-1 inline h-3.5 w-3.5"/>Mon-Fri</button>}<button type="button" onClick={copyAll} className="text-xs font-semibold text-slate-500 hover:text-orange-600">All days</button></div></div>
  {total>720&&<p role="alert" className="mt-2 text-sm text-amber-700 dark:text-amber-300">That's a lot of study time for one day. Please check your availability.</p>}
 </article>;
};

export default function WeeklyAvailabilityEditor({value,onChange}){
 const values=Array.from({length:7},(_,i)=>normalizeMinutes(value?.[i]));
 const initiallySimple=values.slice(0,5).every(v=>v===values[0])&&values.slice(5).every(v=>v===values[5]);
 const[mode,setMode]=useState(initiallySimple?'simple':'custom');
 const weekly=values.reduce((sum,v)=>sum+v,0);
 const setDay=(index,total)=>onChange(values.map((v,i)=>i===index?normalizeMinutes(total):v));
 const setGroup=(indices,total)=>onChange(values.map((v,i)=>indices.includes(i)?normalizeMinutes(total):v));
 return <div className="mt-6">
  <div className="mb-5 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950" role="group" aria-label="Availability mode"><button type="button" onClick={()=>setMode('simple')} className={'h-9 rounded-lg px-4 text-sm font-semibold '+(mode==='simple'?'bg-white text-orange-600 shadow-sm dark:bg-slate-800':'text-slate-500')}>Simple</button><button type="button" onClick={()=>setMode('custom')} className={'h-9 rounded-lg px-4 text-sm font-semibold '+(mode==='custom'?'bg-white text-orange-600 shadow-sm dark:bg-slate-800':'text-slate-500')}><SlidersHorizontal className="mr-1.5 inline h-4 w-4"/>Customize days</button></div>
  {mode==='simple'?<div className="grid gap-4 sm:grid-cols-2"><DayCard day="Weekdays" index={-1} total={values[0]} onChange={v=>setGroup([0,1,2,3,4],v)} copyWeekdays={()=>{}} copyAll={()=>setGroup([0,1,2,3,4,5,6],values[0])}/><DayCard day="Weekends" index={5} total={values[5]} onChange={v=>setGroup([5,6],v)} copyWeekdays={()=>{}} copyAll={()=>setGroup([0,1,2,3,4,5,6],values[5])}/></div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{days.map((day,i)=><DayCard key={day} day={day} index={i} total={values[i]} onChange={v=>setDay(i,v)} copyWeekdays={()=>setGroup([0,1,2,3,4],values[i])} copyAll={()=>setGroup([0,1,2,3,4,5,6],values[i])}/>)}</div>}
  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-500/20 dark:bg-orange-500/10"><span className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-orange-500"/>Weekly Availability</span><div className="text-right"><strong className="text-xl text-slate-900 dark:text-white">{formatDuration(weekly)}</strong><p className="text-sm text-slate-500 dark:text-slate-400">Average: {formatDuration(Math.round(weekly/7))}/day</p></div></div>
 </div>;
}
