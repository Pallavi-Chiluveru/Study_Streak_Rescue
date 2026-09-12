export const maskEmail = (email) => {
  if (typeof email !== 'string' || !email.includes('@')) return 'your registered email';
  const [name, domain] = email.split('@');
  return `${name.slice(0, Math.min(2, Math.max(0, name.length - 1)))}${'\u2022'.repeat(Math.max(4, name.length - 2))}@${domain}`;
};
