const { evaluateUserNotifications } = require('../services/notificationEvaluationService');
const { getUserNotifications, markRead, markAllRead, claimImpact } = require('../services/notificationService');

const listNotifications = async (req, res, next) => {
  try {
    await evaluateUserNotifications(req.user);
    res.json(await getUserNotifications(req.user._id, { limit: req.query.limit }));
  } catch (error) { next(error); }
};
const readNotification = async (req, res, next) => {
  try {
    const item = await markRead(req.user._id, req.params.id);
    if (!item) return res.status(404).json({ message: 'Notification not found.' });
    res.json(item);
  } catch (error) { next(error); }
};
const readAllNotifications = async (req, res, next) => {
  try { res.json({ updated: await markAllRead(req.user._id) }); }
  catch (error) { next(error); }
};
const claimNotificationImpact = async (req, res, next) => {
  try { res.json({ play: Boolean(await claimImpact(req.user._id, req.params.id)) }); }
  catch (error) { next(error); }
};
module.exports = { listNotifications, readNotification, readAllNotifications, claimNotificationImpact };