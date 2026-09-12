const { evaluateGamification } = require('../services/gamificationService');

const getGamification = async (req, res, next) => {
    try {
        res.json(await evaluateGamification(req.user._id));
    } catch (error) {
        next(error);
    }
};

module.exports = { getGamification };