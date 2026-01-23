import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userMessage: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    guruResponse: {
      type: String,
      required: true,
    },
    tokens: {
      prompt: Number,
      completion: Number,
      total: Number,
    },
    mood: {
      type: String,
      enum: ["curious", "anxious", "grateful", "confused", "hopeful", "other"],
      default: "other",
    },
  },
  {
    timestamps: true,
  },
);

// Index para buscar histórico do usuário rapidamente
messageSchema.index({ userId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
