import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Middleware de autenticação JWT
 * Valida o token e anexa o usuário à requisição
 */
export async function authMiddleware(req, res, next) {
  try {
    // Extrai o token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token não fornecido",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário no banco
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    // Anexa o usuário à requisição
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
      });
    }

    console.error("Erro no authMiddleware:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno de autenticação",
    });
  }
}

/**
 * Middleware opcional - Não falha se não houver token
 * Útil para rotas que funcionam com ou sem autenticação
 */
export async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = user;
      req.userId = user._id;
    }

    next();
  } catch (error) {
    // Ignora erros e continua sem autenticação
    next();
  }
}

export default authMiddleware;
