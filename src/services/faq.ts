import { getJson } from './api';

export type FaqArticle = {
  id: string;
  title: string;
  category: string; // ex.: "Acesso", "Rede", "Software", "Hardware"
  content: string;
  tags?: string[];
  lastUpdated?: string; // ISO
};


const localFaq: FaqArticle[] = [
  {
    id: 'faq-acesso-redefinir-senha',
    title: 'Como redefinir minha senha de rede/AD',
    category: 'Acesso',
    content:
      'Passos para redefinir sua senha:\n1) Acesse o portal de credenciais (Ctrl+Alt+Del em Windows logado).\n2) Clique em "Alterar uma senha".\n3) Informe a senha atual e a nova senha (mínimo 8 caracteres, letras e números).\n4) Reinicie a sessão. Se falhar, contate o suporte.',
    tags: ['senha', 'bloqueio', 'login'],
  },
  {
    id: 'faq-rede-sem-internet',
    title: 'Sem internet no Wi‑Fi da empresa',
    category: 'Rede',
    content:
      'Diagnóstico rápido:\n1) Verifique se o Wi‑Fi está ativado.\n2) Reinicie o roteador pessoal (se home office).\n3) Esqueça a rede e reconecte.\n4) Teste em outra rede.\nSe persistir, informe SSID e erro exibido.',
    tags: ['wifi', 'rede', 'vpn'],
  },
  {
    id: 'faq-windows-lento',
    title: 'Windows lento ou travando',
    category: 'Software',
    content:
      'Sugerimos:\n1) Reiniciar o equipamento.\n2) Verificar CPU/Memória/Disco no Gerenciador de Tarefas.\n3) Desativar inicialização de apps não essenciais.\n4) Concluir atualizações pendentes.\nSe não resolver, abra um chamado.',
    tags: ['windows', 'desempenho'],
  },
  {
    id: 'faq-impressora-nao-imprime',
    title: 'Impressora não imprime',
    category: 'Hardware',
    content:
      'Cheque:\n1) Cabos/energia.\n2) Fila de impressão pausada.\n3) Drivers instalados.\n4) Teste com outra impressora.\nPersistindo, anexe erro exibido e modelo.',
    tags: ['impressora', 'hardware'],
  },
];

export async function getFaq(): Promise<FaqArticle[]> {
  try {
    // Se existir endpoint no backend, use-o. Senão, caia para local.
    const items = await getJson<FaqArticle[]>('/faq');
    if (Array.isArray(items) && items.length) return items;
    return localFaq;
  } catch {
    return localFaq;
  }
}

export async function getPopularFaq(): Promise<FaqArticle[]> {
  try {
    const items = await getJson<FaqArticle[]>('/faq/popular');
    if (Array.isArray(items)) return items;
    return [];
  } catch {
    return [];
  }
}
