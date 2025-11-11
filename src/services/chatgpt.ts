export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Base do backend (quando houver). Use EXPO_PUBLIC_API_BASE no app.json/env.
const API_BASE = (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_BASE) || '';

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
  if (!API_BASE) {
    // Sem backend: retorna uma resposta mock para fluxo de desenvolvimento
    return Promise.resolve(respostaMock(mensagens));
  }

  try {
    const resposta = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: mensagens }),
    });
    if (!resposta.ok) {
      return respostaMock(mensagens);
    }
    const dados = await resposta.json();
    const conteudo = dados?.message || dados?.content || dados?.choices?.[0]?.message?.content;
    if (!conteudo) return respostaMock(mensagens);
    return String(conteudo).trim();
  } catch (e) {
    return respostaMock(mensagens);
  }
}

