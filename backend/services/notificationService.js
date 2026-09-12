const Notification = require('../models/Notification');
const EmailDelivery = require('../models/EmailDelivery');
const { decideDeliveryChannels } = require('./notificationPolicyService');
const { sendStudyAlertEmail } = require('./emailService');

const defaultNotificationPreferences = {
  inApp: {
    taskReminders: true,
    deadlineAlerts: true,
    planHealthAlerts: true,
    rescueSuggestions: true,
    achievements: true,
    streaks: true
  },
  email: {
    enabled: true,
    importantDeadlines: true,
    missedWorkAlerts: true,
    planAtRisk: true,
    ordinaryTaskReminders: false,
    weeklySummary: true,
    dailySummary: false
  }
};

const getPreferences = user => {
  const stored = user?.preferences?.notifications?.toObject
    ? user.preferences.notifications.toObject()
    : (user?.preferences?.notifications || {});
  return {
    inApp: { ...defaultNotificationPreferences.inApp, ...(stored.inApp || {}) },
    email: { ...defaultNotificationPreferences.email, ...(stored.email || {}) }
  };
};

const createNotification = async ({ user, eventType, severity, dedupeKey, title, message, actionLabel, actionUrl, actionMethod, relatedTaskId, relatedPlanId, relatedGoalId, expiresAt, impactEligible = false, email }) => {
  const channels = decideDeliveryChannels({
    eventType,
    severity,
    userPreferences: getPreferences(user)
  });

  let notification = null;
  if (channels.inApp) {
    notification = await Notification.findOneAndUpdate(
      { userId: user._id, dedupeKey },
      { $setOnInsert: {
        userId: user._id,
        type: eventType,
        severity,
        channelContext: channels.email ? 'in_app_and_email' : 'in_app',
        title,
        message,
        actionLabel,
        actionUrl,
        actionMethod: actionMethod || 'navigate',
        relatedTaskId,
        relatedPlanId,
        relatedGoalId,
        impactEligible,
        expiresAt
      } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  if (channels.email && email) {
    let delivery;
    try {
      delivery = await EmailDelivery.create({
        userId: user._id,
        type: eventType,
        dedupeKey,
        relatedEntityId: relatedPlanId || relatedGoalId || relatedTaskId || null,
        status: 'pending'
      });
    } catch (error) {
      if (error?.code === 11000) return { notification, channels, emailStatus: 'deduplicated' };
      throw error;
    }

    try {
      await sendStudyAlertEmail({
        to: user.email,
        firstName: String(user.name || 'Learner').split(/s+/)[0],
        ...email
      });
      delivery.status = 'sent';
      delivery.sentAt = new Date();
      await delivery.save();
    } catch {
      delivery.status = 'failed';
      delivery.failedAt = new Date();
      await delivery.save();
      console.error('Study alert email delivery failed.');
    }
  }

  return { notification, channels };
};

const getUserNotifications = async (userId, { limit = 30 } = {}) => {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 30));
  const [items, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(safeLimit).lean(),
    Notification.countDocuments({ userId, readAt: null })
  ]);
  return { items, unreadCount };
};

const markRead = (userId, notificationId) => Notification.findOneAndUpdate(
  { _id: notificationId, userId },
  { $set: { readAt: new Date() } },
  { returnDocument: 'after' }
);

const markAllRead = async userId => {
  const result = await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
  return result.modifiedCount;
};

const claimImpact = (userId, notificationId) => Notification.findOneAndUpdate(
  { _id: notificationId, userId, impactEligible: true, impactClaimedAt: null },
  { $set: { impactClaimedAt: new Date() } },
  { returnDocument: 'after' }
);

module.exports = {
  defaultNotificationPreferences,
  getPreferences,
  createNotification,
  getUserNotifications,
  markRead,
  markAllRead,
  claimImpact
};