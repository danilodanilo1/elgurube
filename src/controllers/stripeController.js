import Stripe from "stripe";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  handleWebhook,
} from "../services/stripeService.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Cria sessão de checkout para assinatura Premium
 * POST /api/stripe/create-checkout-session
 */
export async function createCheckout(req, res) {
  try {
    const user = req.user;

    // Verifica se já é Premium
    if (user.isPremium) {
      return res.status(400).json({
        success: false,
        message: "Você já é membro Premium",
      });
    }

    const result = await createCheckoutSession(user._id, user.email);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Erro ao criar sessão de pagamento",
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        url: result.url,
      },
    });
  } catch (error) {
    console.error("Erro ao criar checkout:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar pagamento",
    });
  }
}

/**
 * Cria portal do cliente para gerenciar assinatura
 * POST /api/stripe/customer-portal
 */
export async function createPortal(req, res) {
  try {
    const user = req.user;

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: "Você não possui uma assinatura ativa",
      });
    }

    const result = await createCustomerPortalSession(user.stripeCustomerId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Erro ao criar portal do cliente",
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        url: result.url,
      },
    });
  } catch (error) {
    console.error("Erro ao criar portal:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao acessar portal do cliente",
    });
  }
}

/**
 * Webhook do Stripe
 * POST /api/stripe/webhook
 */
export async function webhook(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    // Verifica a assinatura do webhook
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Erro na assinatura do webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processa o evento
  const result = await handleWebhook(event);

  if (!result.success) {
    console.error("Erro ao processar webhook:", result.error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }

  res.json({ received: true });
}

/**
 * Verifica status da assinatura
 * GET /api/stripe/subscription-status
 */
export async function getSubscriptionStatus(req, res) {
  try {
    const user = req.user;

    if (!user.stripeSubscriptionId) {
      return res.json({
        success: true,
        data: {
          hasSubscription: false,
          isPremium: false,
        },
      });
    }

    // Busca informações atualizadas do Stripe
    const subscription = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId,
    );

    res.json({
      success: true,
      data: {
        hasSubscription: true,
        isPremium: user.isPremium,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar assinatura:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao verificar status da assinatura",
    });
  }
}

export default {
  createCheckout,
  createPortal,
  webhook,
  getSubscriptionStatus,
};
