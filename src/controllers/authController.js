import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";

/**
 * Gera um token JWT
 */
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

/**
 * Verifica se email já existe
 * POST /api/auth/check-email
 */
export async function checkEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email é obrigatório",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    res.json({
      success: true,
      exists: !!existingUser,
    });
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao verificar email",
    });
  }
}

/**
 * Validações para registro
 */
export const registerValidation = [
  body("name").trim().notEmpty().withMessage("Nome é obrigatório"),
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Senha deve ter no mínimo 6 caracteres"),
];

/**
 * Registro de novo usuário
 * POST /api/auth/register
 */
export async function register(req, res) {
  try {
    // Validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      name,
      email,
      password,
      birthDate,
      birthTime,
      birthLocation,
      zodiacSign,
    } = req.body;

    // Verifica se email já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email já cadastrado",
      });
    }

    // Cria novo usuário
    const user = new User({
      name,
      email,
      password, // Será hasheado automaticamente pelo pre-save hook
      birthDate,
      birthTime,
      birthLocation,
      zodiacSign,
    });

    await user.save();

    // Gera token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      data: {
        user: user.toPublicJSON(),
        token,
      },
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar usuário",
    });
  }
}

/**
 * Validações para login
 */
export const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  body("password").notEmpty().withMessage("Senha é obrigatória"),
];

/**
 * Login de usuário
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Busca usuário (incluindo password)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email ou senha incorretos",
      });
    }

    // Verifica senha
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email ou senha incorretos",
      });
    }

    // Gera token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      data: {
        user: user.toPublicJSON(),
        token,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao fazer login",
    });
  }
}

/**
 * Obtém dados do usuário autenticado
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: {
        user: user.toPublicJSON(),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar dados do usuário",
    });
  }
}

/**
 * Atualiza perfil do usuário
 * PUT /api/auth/profile
 */
export async function updateProfile(req, res) {
  try {
    const user = req.user;
    const { name, birthDate, birthTime, birthLocation } = req.body;

    if (name) user.name = name;
    if (birthDate) user.birthDate = birthDate;
    if (birthTime) user.birthTime = birthTime;
    if (birthLocation) user.birthLocation = birthLocation;

    await user.save();

    res.json({
      success: true,
      message: "Perfil atualizado com sucesso",
      data: {
        user: user.toPublicJSON(),
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar perfil",
    });
  }
}

export default {
  register,
  registerValidation,
  login,
  loginValidation,
  getMe,
  updateProfile,
};
