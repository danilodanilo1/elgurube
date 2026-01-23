import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

/**
 * Sistema de Prompt - Define a personalidade do El Guru
 */
const SYSTEM_PROMPT = `Você é o El Guru, um mestre espiritual moderno que combina sabedoria milenar com compreensão contemporânea.

IDENTIDADE:
- Você é empático, profundo e misterioso, mas sempre prático
- Domina astrologia, tarot, numerologia e filosofias esotéricas
- Seu tom é acolhedor, sábio e ligeiramente poético
- Você usa metáforas cósmicas, mas traz insights aplicáveis ao dia a dia

DIRETRIZES:
1. Sempre valide os sentimentos do usuário antes de oferecer orientação
2. Use referências astrológicas quando relevante (signos, planetas, casas)
3. Seja conciso mas profundo - máximo 200 palavras por resposta
4. Encoraje autoconhecimento, nunca decisões impulsivas
5. Se o usuário pedir previsões específicas, redirecione para potenciais e possibilidades
6. Evite jargões excessivos - seja místico mas compreensível
7. Termine respostas com uma reflexão ou pergunta que aprofunde o diálogo

ESTILO:
- Use emojis sutis e místicos (🌙✨🔮💫🌟)
- Exemplo de tom: "Percebo que as energias de transformação estão intensas em seu caminho..."
- Evite: "De acordo com a astrologia..." (seja mais natural)

IMPORTANTE: Você não prevê o futuro, você ilumina caminhos possíveis.`;

/**
 * Cria um contexto personalizado baseado nos dados do usuário
 */
function buildUserContext(user) {
  let context = `\nCONTEXTO DO USUÁRIO:\n- Nome: ${user.name}`;

  if (user.birthDate) {
    const birthDate = new Date(user.birthDate);
    const signs = [
      "Capricórnio",
      "Aquário",
      "Peixes",
      "Áries",
      "Touro",
      "Gêmeos",
      "Câncer",
      "Leão",
      "Virgem",
      "Libra",
      "Escorpião",
      "Sagitário",
    ];
    const month = birthDate.getMonth();
    const day = birthDate.getDate();

    // Cálculo simplificado do signo (pode ser refinado)
    let signIndex = month;
    if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) signIndex = 1; // Aquário
    // ... (implementação completa seria mais extensa)

    context += `\n- Data de Nascimento: ${birthDate.toLocaleDateString("pt-BR")}`;
    context += `\n- Signo Solar: ${signs[signIndex]}`;
  }

  if (user.birthTime) {
    context += `\n- Horário de Nascimento: ${user.birthTime}`;
  }

  if (user.birthLocation?.city) {
    context += `\n- Local de Nascimento: ${user.birthLocation.city}, ${user.birthLocation.state || user.birthLocation.country}`;
  }

  context += `\n- Status: ${user.isPremium ? "Membro Premium 🌟" : "Visitante"}`;

  return context;
}

/**
 * Envia mensagem para o El Guru (OpenAI GPT-4)
 */
export async function sendMessageToGuru(
  userMessage,
  user,
  conversationHistory = [],
) {
  try {
    // Constrói o contexto personalizado
    const userContext = buildUserContext(user);

    // Prepara o histórico de conversação
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT + userContext,
      },
    ];

    // Adiciona histórico recente (últimas 5 mensagens para contexto)
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-5);
      recentHistory.forEach((msg) => {
        messages.push({ role: "user", content: msg.userMessage });
        messages.push({ role: "assistant", content: msg.guruResponse });
      });
    }

    // Adiciona mensagem atual
    messages.push({
      role: "user",
      content: userMessage,
    });

    // Chama a API do OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.8, // Um pouco de criatividade
      max_tokens: 500,
      presence_penalty: 0.6, // Evita repetição
      frequency_penalty: 0.3,
    });

    const response = completion.choices[0].message.content;
    const usage = completion.usage;

    return {
      success: true,
      response,
      tokens: {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens,
      },
    };
  } catch (error) {
    console.error("Erro no OpenAI Service:", error);

    // Tratamento de erros específicos
    if (error.code === "insufficient_quota") {
      return {
        success: false,
        error: "Limite de API excedido. Por favor, tente novamente mais tarde.",
      };
    }

    if (error.code === "invalid_api_key") {
      return {
        success: false,
        error: "Configuração de API inválida.",
      };
    }

    return {
      success: false,
      error: "Erro ao conectar com o El Guru. Tente novamente.",
    };
  }
}

/**
 * Gera uma resposta de fallback caso a API falhe
 */
export function getFallbackResponse(userMessage) {
  const fallbacks = [
    "🌙 As energias cósmicas estão temporariamente turbulentas. Volte em instantes para que eu possa te guiar adequadamente.",
    "✨ Percebo uma interferência na conexão espiritual. Aguarde um momento enquanto realinho as energias.",
    "🔮 Os astros pedem paciência. Retorne em breve e continuaremos sua jornada de autoconhecimento.",
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export default {
  sendMessageToGuru,
  getFallbackResponse,
};
