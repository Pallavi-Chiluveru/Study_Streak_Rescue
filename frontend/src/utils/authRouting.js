export const onboardingStatus = user => user?.goalOnboarding?.status;
export const destinationAfterAuth = user => {
  const status = onboardingStatus(user);
  return status === 'not_started' || status === 'in_progress'
    ? '/onboarding/goals'
    : '/dashboard';
};
