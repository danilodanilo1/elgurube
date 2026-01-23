import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  checkMessageLimit,
  requirePremium,
  attachUsageInfo,
} from "../middlewares/messageGuard.js";

// Controllers
import * as authController from "../controllers/authController.js";
import * as chatController from "../controllers/chatController.js";
import * as stripeController from "../controllers/stripeController.js";

const router = express.Router();

// ========================================
// ROTAS DE AUTENTICAÇÃO
// ========================================

// Verificar se email existe
router.post("/auth/check-email", authController.checkEmail);

// Registro de novo usuário
router.post(
  "/auth/register",
  authController.registerValidation,
  authController.register,
);

// Login
router.post(
  "/auth/login",
  authController.loginValidation,
  authController.login,
);

// Obter dados do usuário autenticado
router.get("/auth/me", authMiddleware, authController.getMe);

// Atualizar perfil
router.put("/auth/profile", authMiddleware, authController.updateProfile);

// ========================================
// ROTAS DO CHAT (IA)
// ========================================

// Enviar mensagem para o El Guru
// ⚠️ CRÍTICO: checkMessageLimit bloqueia após 2 mensagens para não-Premium
router.post(
  "/chat/message",
  authMiddleware,
  checkMessageLimit, // <- O CORAÇÃO DO PAYWALL
  chatController.sendMessageValidation,
  chatController.sendMessage,
);

// Histórico de conversas
router.get("/chat/history", authMiddleware, chatController.getHistory);

// Estatísticas de uso
router.get(
  "/chat/stats",
  authMiddleware,
  attachUsageInfo,
  chatController.getStats,
);

// Deletar mensagem específica
router.delete(
  "/chat/message/:id",
  authMiddleware,
  chatController.deleteMessage,
);

// Limpar todo o histórico (apenas Premium)
router.delete(
  "/chat/history",
  authMiddleware,
  requirePremium,
  chatController.clearHistory,
);

// ========================================
// ROTAS DO STRIPE (PAGAMENTOS)
// ========================================

// Criar sessão de checkout
router.post(
  "/stripe/create-checkout-session",
  authMiddleware,
  stripeController.createCheckout,
);

// Portal do cliente (gerenciar assinatura)
router.post(
  "/stripe/customer-portal",
  authMiddleware,
  stripeController.createPortal,
);

// Status da assinatura
router.get(
  "/stripe/subscription-status",
  authMiddleware,
  stripeController.getSubscriptionStatus,
);

// Webhook do Stripe (sem autenticação - usa validação do Stripe)
router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }), // Raw body para validação de assinatura
  stripeController.webhook,
);

// ========================================
// ROTA DE HEALTH CHECK
// ========================================

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "El Guru API is running",
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
  });
});

export default router;
