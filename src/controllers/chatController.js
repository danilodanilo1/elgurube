import { body, validationResult } from "express-validator";
import Message from "../models/Message.js";
import {
  sendMessageToGuru,
  getFallbackResponse,
} from "../services/openaiService.js";

/**
 * Validações para envio de mensagem
 */
export const sendMessageValidation = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Mensagem não pode estar vazia")
    .isLength({ max: 2000 })
    .withMessage("Mensagem muito longa (máximo 2000 caracteres)"),
];

/**
 * Envia mensagem para o El Guru
 * POST /api/chat/message
 * Requer: authMiddleware + checkMessageLimit
 */
export async function sendMessage(req, res) {
  try {
    // Validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { message, mood } = req.body;
    const user = req.user;

    // Busca histórico recente para contexto
    const recentMessages = await Message.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Envia para OpenAI
    const guruResult = await sendMessageToGuru(message, user, recentMessages);

    if (!guruResult.success) {
      // Usa resposta de fallback em caso de erro
      const fallbackText = getFallbackResponse(message);

      return res.status(503).json({
        success: false,
        message: "Erro temporário ao conectar com o El Guru",
        fallback: fallbackText,
      });
    }

    // Salva a mensagem no banco
    const messageDoc = new Message({
      userId: user._id,
      userMessage: message,
      guruResponse: guruResult.response,
      tokens: guruResult.tokens,
      mood: mood || "other",
    });

    await messageDoc.save();

    // Incrementa contador de mensagens do usuário
    await user.incrementMessageCount();

    // Calcula mensagens restantes
    const today = new Date().toDateString();
    const lastMessageDay = user.lastMessageDate.toDateString();
    const currentCount = lastMessageDay === today ? user.dailyMessageCount : 1;
    const messagesRemaining = user.isPremium
      ? "unlimited"
      : Math.max(0, 2 - currentCount);

    res.json({
      success: true,
      data: {
        response: guruResult.response,
        messageId: messageDoc._id,
        usage: {
          messagesUsedToday: currentCount,
          messagesRemaining,
          isPremium: user.isPremium,
        },
      },
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar mensagem",
    });
  }
}

/**
 * Obtém histórico de conversas do usuário
 * GET /api/chat/history
 * Query params: limit (default: 20), page (default: 1)
 */
export async function getHistory(req, res) {
  try {
    const user = req.user;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Message.countDocuments({ userId: user._id });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar histórico",
    });
  }
}

/**
 * Deleta uma mensagem específica
 * DELETE /api/chat/message/:id
 */
export async function deleteMessage(req, res) {
  try {
    const user = req.user;
    const messageId = req.params.id;

    const message = await Message.findOne({
      _id: messageId,
      userId: user._id,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Mensagem não encontrada",
      });
    }

    await message.deleteOne();

    res.json({
      success: true,
      message: "Mensagem deletada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar mensagem:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao deletar mensagem",
    });
  }
}

/**
 * Limpa todo o histórico do usuário
 * DELETE /api/chat/history
 */
export async function clearHistory(req, res) {
  try {
    const user = req.user;

    const result = await Message.deleteMany({ userId: user._id });

    res.json({
      success: true,
      message: `${result.deletedCount} mensagens deletadas`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error("Erro ao limpar histórico:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao limpar histórico",
    });
  }
}

/**
 * Obtém estatísticas de uso
 * GET /api/chat/stats
 */
export async function getStats(req, res) {
  try {
    const user = req.user;

    const totalMessages = await Message.countDocuments({ userId: user._id });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessages = await Message.countDocuments({
      userId: user._id,
      createdAt: { $gte: today },
    });

    const lastMessage = await Message.findOne({ userId: user._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: {
        totalMessages,
        todayMessages,
        lastMessageDate: lastMessage?.createdAt,
        isPremium: user.isPremium,
        messagesRemaining: user.isPremium
          ? "unlimited"
          : Math.max(0, 2 - user.dailyMessageCount),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar estatísticas",
    });
  }
}

export default {
  sendMessage,
  sendMessageValidation,
  getHistory,
  deleteMessage,
  clearHistory,
  getStats,
};
