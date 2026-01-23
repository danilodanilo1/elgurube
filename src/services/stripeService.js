import Stripe from "stripe";
import User from "../models/User.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Cria uma sessão de checkout para assinatura Premium
 */
export async function createCheckoutSession(userId, email) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // ID do plano de R$ 4,90/mês
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/membership?canceled=true`,
      metadata: {
        userId: userId.toString(),
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
        },
      },
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("Erro ao criar checkout session:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cria portal do cliente para gerenciar assinatura
 */
export async function createCustomerPortalSession(customerId) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/account`,
    });

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    console.error("Erro ao criar portal session:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Processa webhook do Stripe
 */
export async function handleWebhook(event) {
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Checkout completado - Ativa assinatura Premium
 */
async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  const user = await User.findById(userId);
  if (!user) {
    console.error("Usuário não encontrado:", userId);
    return;
  }

  user.isPremium = true;
  user.stripeCustomerId = customerId;
  user.stripeSubscriptionId = subscriptionId;
  user.subscriptionStatus = "active";
  user.subscriptionStartDate = new Date();

  await user.save();

  console.log(`✅ Usuário ${user.email} agora é Premium!`);
}

/**
 * Invoice pago - Renova assinatura
 */
async function handleInvoicePaid(invoice) {
  const customerId = invoice.customer;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  user.isPremium = true;
  user.subscriptionStatus = "active";

  await user.save();

  console.log(`✅ Assinatura renovada para ${user.email}`);
}

/**
 * Pagamento falhou
 */
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  user.subscriptionStatus = "past_due";

  await user.save();

  console.log(`⚠️ Pagamento falhou para ${user.email}`);
}

/**
 * Assinatura cancelada - Remove acesso Premium
 */
async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  user.isPremium = false;
  user.subscriptionStatus = "canceled";
  user.subscriptionEndDate = new Date();

  await user.save();

  console.log(`❌ Assinatura cancelada para ${user.email}`);
}

/**
 * Assinatura atualizada
 */
async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  user.subscriptionStatus = subscription.status;

  if (subscription.status === "active") {
    user.isPremium = true;
  } else if (["canceled", "unpaid"].includes(subscription.status)) {
    user.isPremium = false;
  }

  await user.save();

  console.log(
    `🔄 Assinatura atualizada para ${user.email}: ${subscription.status}`,
  );
}

export default {
  createCheckoutSession,
  createCustomerPortalSession,
  handleWebhook,
};
