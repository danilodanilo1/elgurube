import mongoose from "mongoose";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);

    // Event listeners
    mongoose.connection.on("error", (err) => {
      console.error("❌ Erro no MongoDB:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB desconectado");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB desconectado devido ao término da aplicação");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB:", error);
    process.exit(1);
  }
}

export default connectDB;
