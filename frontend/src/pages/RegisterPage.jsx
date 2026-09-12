import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/authContext.js';
import { useToast } from '../context/ToastContext';
import LightningBackground from '../components/ui/LightningBackground';
import ThemeToggle from '../components/ui/ThemeToggle';
import BrandLogo from '../components/ui/BrandLogo';
import { destinationAfterAuth } from '../utils/authRouting';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RegisterPage = () => {
  const navigate=useNavigate(), {register}=useAuth(), {addToast}=useToast();
  const [values,setValues]=useState({name:'',email:'',password:''});
  const [errors,setErrors]=useState({}),[showPassword,setShowPassword]=useState(false),[loading,setLoading]=useState(false);
  const update=(field,value)=>{setValues(current=>({...current,[field]:value}));if(errors[field])setErrors(current=>({...current,[field]:''}));};
  const validate=()=>{const next={};if(!values.name.trim())next.name='Full name is required.';if(!emailPattern.test(values.email.trim()))next.email='Enter a valid email address.';if(values.password.length<8)next.password='Password must be at least 8 characters.';else if(new TextEncoder().encode(values.password).length>72)next.password='Password must be 72 bytes or fewer.';setErrors(next);return Object.keys(next).length===0;};
  const handleSubmit=async event=>{event.preventDefault();if(loading||!validate())return;setLoading(true);try{const registeredUser=await register(values.name.trim(),values.email.trim(),values.password);addToast('Account created successfully!','success');navigate(destinationAfterAuth(registeredUser),{replace:true});}catch(error){addToast(error.response?.data?.message||'Registration failed','error');}finally{setLoading(false);}};
  const inputClass=field=>'register-input h-11 w-full rounded-xl border bg-white/90 pl-11 text-base text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 '+(errors[field]?'border-red-500 ring-4 ring-red-500/10':'border-slate-300 dark:border-slate-700');
  return <main className="auth-surface relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F8FA] px-4 py-8 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
    <LightningBackground intensity="medium" className="register-ambient"/>
    <div className="register-energy-field pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="register-glow register-glow-top"/>
      <div className="register-glow register-glow-bottom"/>
      <svg className="register-electric-streak register-electric-streak-left" viewBox="0 0 360 560" fill="none">
        <path d="M314 8L210 166L254 191L142 337L184 361L48 548" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M334 26L238 171L278 196L174 340" stroke="currentColor" strokeWidth="5" opacity=".08"/>
      </svg>
      <svg className="register-electric-streak register-electric-streak-right" viewBox="0 0 420 380" fill="none">
        <path d="M6 325C88 292 91 224 169 207C248 190 256 89 413 31" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M21 349C108 313 105 252 183 232C266 212 278 104 404 53" stroke="currentColor" strokeWidth=".75" opacity=".48"/>
      </svg>
      <span className="register-spark register-spark-one"/>
      <span className="register-spark register-spark-two"/>
    </div>
    <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle/></div>
    <div className="relative z-10 w-full max-w-[450px]"><div className="register-brand mb-6 flex justify-center sm:mb-7"><div className="register-brand-halo"><BrandLogo/></div></div>
      <section className="register-card relative rounded-2xl border border-orange-200/70 bg-white/95 p-6 shadow-[0_24px_70px_rgba(124,45,18,0.12)] backdrop-blur-sm dark:border-orange-500/20 dark:bg-slate-900/95 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:p-8">
        <header><h1 className="text-3xl font-extrabold tracking-tight">Create Account</h1><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Start building a study plan that adapts when life changes.</p></header>
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          <div><label htmlFor="register-name" className="mb-1.5 block text-sm font-semibold">Full Name</label><div className="relative"><User aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"/><input id="register-name" name="name" type="text" autoComplete="name" value={values.name} onChange={e=>update('name',e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name?'register-name-error':undefined} placeholder="Enter your full name" className={inputClass('name')}/></div>{errors.name&&<p id="register-name-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}</div>
          <div><label htmlFor="register-email" className="mb-1.5 block text-sm font-semibold">Email Address</label><div className="relative"><Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"/><input id="register-email" name="email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={e=>update('email',e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email?'register-email-error':undefined} placeholder="you@example.com" className={inputClass('email')}/></div>{errors.email&&<p id="register-email-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}</div>
          <div><label htmlFor="register-password" className="mb-1.5 block text-sm font-semibold">Password</label><div className="relative"><Lock aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"/><input id="register-password" name="password" type={showPassword?'text':'password'} autoComplete="new-password" value={values.password} onChange={e=>update('password',e.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby="register-password-help" placeholder="Enter your password" className={inputClass('password')+' pr-11'}/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'} className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-slate-800 dark:hover:text-slate-200">{showPassword?<EyeOff aria-hidden="true" className="h-[18px] w-[18px]"/>:<Eye aria-hidden="true" className="h-[18px] w-[18px]"/>}</button></div><p id="register-password-help" className={'mt-1.5 text-sm '+(errors.password?'text-red-600 dark:text-red-400':'text-slate-500 dark:text-slate-400')}>{errors.password||'Use at least 8 characters.'}</p></div>
          <button type="submit" disabled={loading} className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-400/40 bg-gradient-to-r from-orange-500 to-amber-500 px-5 text-sm font-semibold text-white shadow-md shadow-orange-500/15 transition duration-200 hover:-translate-y-0.5 hover:from-orange-600 hover:to-amber-500 hover:shadow-lg hover:shadow-orange-500/20 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/20 disabled:pointer-events-none disabled:opacity-60">{loading?<LoaderCircle aria-hidden="true" className="h-[18px] w-[18px] animate-spin"/>:<UserPlus aria-hidden="true" className="h-[18px] w-[18px]"/>}{loading?'Creating Account...':'Create Account'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">Already have an account? <Link to="/login" className="font-semibold text-orange-600 hover:underline dark:text-orange-400">Log In</Link></p>
      </section>
    </div>
  </main>;
};
export default RegisterPage;
