import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // Identidade
    name: {
      type: String,
      required: [true, "Nome é obrigatório"],
      trim: true,
      maxlength: [100, "Nome muito longo"],
    },
    email: {
      type: String,
      required: [true, "Email é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email inválido"],
    },
    password: {
      type: String,
      required: [true, "Senha é obrigatória"],
      minlength: [6, "Senha deve ter no mínimo 6 caracteres"],
      select: false, // Não retorna password por padrão em queries
    },

    // Dados Esotéricos
    birthDate: {
      type: Date,
      required: false,
    },
    birthTime: {
      type: String, // Formato: "14:30"
      required: false,
    },
    birthLocation: {
      type: String, // Cidade/Local de nascimento como texto simples
      required: false,
    },
    zodiacSign: {
      type: String, // Signo do zodíaco
      required: false,
    },

    // Assinatura Stripe
    isPremium: {
      type: Boolean,
      default: false,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "canceled", "past_due", "trialing", "none"],
      default: "none",
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },

    // Controle de Uso de IA
    dailyMessageCount: {
      type: Number,
      default: 0,
    },
    lastMessageDate: {
      type: Date,
      default: null,
    },
    totalMessagesAllTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password antes de salvar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para verificar se usuário pode enviar mensagem
userSchema.methods.canSendMessage = function () {
  if (this.isPremium) return true;

  const today = new Date().toDateString();
  const lastMessageDay = this.lastMessageDate
    ? this.lastMessageDate.toDateString()
    : null;

  // Reset contador se for um novo dia
  if (lastMessageDay !== today) {
    return true; // Será resetado no controller
  }

  return this.dailyMessageCount < 2;
};

// Método para incrementar contador de mensagens
userSchema.methods.incrementMessageCount = async function () {
  const today = new Date().toDateString();
  const lastMessageDay = this.lastMessageDate
    ? this.lastMessageDate.toDateString()
    : null;

  // Reset se for novo dia
  if (lastMessageDay !== today) {
    this.dailyMessageCount = 1;
  } else {
    this.dailyMessageCount += 1;
  }

  this.lastMessageDate = new Date();
  this.totalMessagesAllTime += 1;
  await this.save();
};

// Método para retornar dados públicos do usuário
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    birthDate: this.birthDate,
    birthTime: this.birthTime,
    birthLocation: this.birthLocation,
    zodiacSign: this.zodiacSign,
    isPremium: this.isPremium,
    subscriptionStatus: this.subscriptionStatus,
    dailyMessageCount: this.dailyMessageCount,
    canSendMessage: this.canSendMessage(),
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);

export default User;
