const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      // Exact timestamp handles password changes within the same JWT iat second.
      const changedAt = req.user.passwordChangedAt?.getTime() || 0;
      const validSession = decoded.passwordChangedAt !== undefined
        ? decoded.passwordChangedAt === changedAt
        : !changedAt || (Number.isFinite(decoded.iat) && decoded.iat * 1000 > changedAt);
      if (!validSession) return res.status(401).json({ message: 'Session expired because your password was changed.' });
      return next();
    } catch (error) {
      console.error('Authentication verification failed.');
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
