/**
 * Middleware de verificação de limite de mensagens
 * O CORAÇÃO DO NEGÓCIO - Força o paywall após 2 mensagens gratuitas
 */
export async function checkMessageLimit(req, res, next) {
  try {
    const user = req.user;

    // ✅ Usuários Premium têm acesso ilimitado
    if (user.isPremium) {
      return next();
    }

    // 🔍 Verifica se é um novo dia - Reset automático
    const today = new Date().toDateString();
    const lastMessageDay = user.lastMessageDate
      ? user.lastMessageDate.toDateString()
      : null;

    // Reset diário do contador
    if (lastMessageDay !== today) {
      user.dailyMessageCount = 0;
      user.lastMessageDate = new Date();
      await user.save();
    }

    // 🚫 Bloqueio: Limite de 2 mensagens gratuitas por dia
    if (user.dailyMessageCount >= 2) {
      return res.status(403).json({
        success: false,
        message: "Limite de mensagens gratuitas atingido",
        error: "MESSAGE_LIMIT_REACHED",
        data: {
          dailyLimit: 2,
          usedMessages: user.dailyMessageCount,
          isPremium: false,
          upgradeRequired: true,
          upgradeMessage:
            "Torne-se Premium por apenas R$ 4,90/mês e tenha acesso ilimitado ao El Guru! 🌟",
        },
      });
    }

    // ✅ Permite o envio (será incrementado no controller)
    next();
  } catch (error) {
    console.error("Erro no checkMessageLimit:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao verificar limite de mensagens",
    });
  }
}

/**
 * Middleware para verificar se usuário é Premium
 */
export function requirePremium(req, res, next) {
  if (!req.user.isPremium) {
    return res.status(403).json({
      success: false,
      message: "Acesso exclusivo para membros Premium",
      error: "PREMIUM_REQUIRED",
      data: {
        isPremium: false,
        upgradeRequired: true,
      },
    });
  }

  next();
}

/**
 * Middleware para retornar informações de uso
 */
export function attachUsageInfo(req, res, next) {
  const user = req.user;

  const today = new Date().toDateString();
  const lastMessageDay = user.lastMessageDate
    ? user.lastMessageDate.toDateString()
    : null;

  // Se for novo dia, o contador é 0
  const currentCount = lastMessageDay === today ? user.dailyMessageCount : 0;

  req.usageInfo = {
    isPremium: user.isPremium,
    dailyLimit: user.isPremium ? "unlimited" : 2,
    messagesUsedToday: currentCount,
    messagesRemaining: user.isPremium
      ? "unlimited"
      : Math.max(0, 2 - currentCount),
    canSendMessage: user.isPremium || currentCount < 2,
  };

  next();
}

export default {
  checkMessageLimit,
  requirePremium,
  attachUsageInfo,
};
