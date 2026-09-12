const impactEase = [0.22, 1, 0.36, 1];

export const shakeZoomImpact = ({ mobile = false, reducedMotion = false } = {}) => ({
  initial: { opacity: 0, scale: 0.98, x: 0 },
  animate: reducedMotion
    ? { opacity: 1, scale: 1, x: 0, transition: { duration: 0.24, ease: impactEase } }
    : { opacity: [0, 1, 1, 1, 1, 1], scale: [0.98, mobile ? 1.015 : 1.025, 1.012, 1.006, 1.002, 1], x: mobile ? [0, -1, 1, -0.5, 0.5, 0] : [0, -2, 2, -1, 1, 0], transition: { duration: 0.34, ease: impactEase, times: [0, 0.2, 0.42, 0.62, 0.8, 1] } }
});

export const warningShakeZoomImpact = ({ mobile = false, reducedMotion = false } = {}) => ({
  initial: { opacity: 0, scale: 0.985, x: 0 },
  animate: reducedMotion
    ? { opacity: 1, scale: 1, x: 0, transition: { duration: 0.22, ease: impactEase } }
    : { opacity: [0, 1, 1, 1], scale: [0.985, mobile ? 1.008 : 1.015, 1.006, 1], x: mobile ? [0, -0.75, 0.75, 0] : [0, -1.5, 1.5, 0], transition: { duration: 0.25, ease: impactEase, times: [0, 0.32, 0.66, 1] } }
});

export const impactIconEntrance = (reducedMotion = false) => ({ initial: { opacity: 0, scale: 0.82 }, animate: { opacity: 1, scale: 1, transition: { delay: reducedMotion ? 0 : 0.12, duration: 0.22, ease: impactEase } } });
export const impactReveal = (reducedMotion = false) => ({ initial: { opacity: 0, y: reducedMotion ? 0 : 8 }, animate: { opacity: 1, y: 0, transition: { delay: reducedMotion ? 0 : 0.2, duration: 0.26, ease: impactEase } } });
export const energySweep = (reducedMotion = false) => ({ initial: { opacity: 0, x: '-120%' }, animate: reducedMotion ? { opacity: 0 } : { opacity: [0, 0.45, 0], x: ['-120%', '20%', '120%'], transition: { delay: 0.08, duration: 0.42, ease: impactEase } } });