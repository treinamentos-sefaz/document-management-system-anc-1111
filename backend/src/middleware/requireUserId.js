const AppError = require('../errors/AppError');

function requireUserId(req, res, next) {
  const userId = req.get('X-User-Id');

  if (!userId || !userId.trim()) {
    return next(new AppError(400, 'MISSING_USER_ID', 'O cabeçalho X-User-Id é obrigatório.'));
  }

  req.userId = userId;
  return next();
}

module.exports = requireUserId;