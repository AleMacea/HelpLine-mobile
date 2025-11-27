import { API_BASE } from './api';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const CHAT_ENDPOINT = API_BASE ? `${API_BASE}/chat` : '';
let chatEndpointUnavailable = false;

// Resposta de desenvolvimento quando não há backend
function respostaMock(mensagens: ChatMessage[]): string {
  const ultimo = [...mensagens].reverse().find((m) => m.role === 'user');
  const texto = (ultimo?.content || '').toLowerCase();
  if (texto.includes('wifi') || texto.includes('wi-fi') || texto.includes('rede')) {
    return 'Vamos verificar sua conexão: 1) Confirme se o Wi‑Fi está ativo; 2) Desligue/ligue o roteador; 3) Teste outra rede. Se persistir, informe o SSID e se há erro específico.';
  }
  if (texto.includes('senha') || texto.includes('acesso') || texto.includes('login')) {
    return 'Para acesso/senha: 1) Tente redefinição no portal; 2) Verifique se há bloqueio por tentativas; 3) Informe usuário/sistema afetado (sem dados sensíveis).';
  }
  if (texto.includes('impressora')) {
    return 'Para impressoras: 1) Verifique cabos/energia; 2) Veja se a fila está pausada; 3) Reinstale drivers; 4) Informe modelo/erro exibido.';
  }
  return 'Certo! Para ajudar melhor, descreva o que acontece, quando começou, qual sistema/equipamento está envolvido e se há mensagem de erro. Posso sugerir passos de diagnóstico em seguida.';
}

export async function enviarParaChatGPT(mensagens: ChatMessage[]): Promise<string> {
  if (!CHAT_ENDPOINT || chatEndpointUnavailable) {
    return Promise.resolve(respostaMock(mensagens));
  }

  try {
    const resposta = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: mensagens }),
    });
    if (resposta.status === 404) {
      chatEndpointUnavailable = true;
      return respostaMock(mensagens);
    }
    if (!resposta.ok) {
      return respostaMock(mensagens);
    }
    const dados = await resposta.json();
    const conteudo = dados?.message || dados?.content || dados?.choices?.[0]?.message?.content;
    if (!conteudo) return respostaMock(mensagens);
    return String(conteudo).trim();
  } catch (e) {
    console.warn('Falha ao consultar /chat, usando fallback local', e);
    return respostaMock(mensagens);
  }
}








