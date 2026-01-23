import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/database.js";
import apiRoutes from "./routes/api.js";

// Carrega variáveis de ambiente
dotenv.config();

// Inicializa Express
const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARES GLOBAIS
// ========================================

// Segurança
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Body parser (exceto para webhook do Stripe)
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") {
    next(); // Webhook precisa de raw body
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

// ========================================
// LOGGING (Desenvolvimento)
// ========================================

if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ========================================
// ROTAS
// ========================================

app.use("/api", apiRoutes);

// Rota raiz
app.get("/", (req, res) => {
  res.json({
    message: "🔮 Bem-vindo ao El Guru API",
    version: "1.0.0",
    docs: "/api/health",
  });
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 - Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Rota não encontrada",
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Erro interno do servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ========================================
// INICIALIZAÇÃO
// ========================================

async function startServer() {
  try {
    // Conecta ao MongoDB
    await connectDB();

    // Inicia servidor
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║       🔮 EL GURU API RUNNING 🔮       ║
║                                       ║
║   Port: ${PORT}                        
║   Environment: ${process.env.NODE_ENV || "development"}   
║   MongoDB: Connected ✅               ║
║                                       ║
╚═══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Falha ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();

export default app;
