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
      'Passo a passo para recuperar acesso:\n' +
      '1) Conecte-se na rede corporativa (ou VPN) e pressione Ctrl+Alt+Del no Windows.\n' +
      '2) Selecione "Alterar uma senha" e informe a senha atual e a nova senha.\n' +
      '3) Use uma senha forte: mínimo 8 caracteres com maiúsculas, minúsculas, número e símbolo.\n' +
      '4) Após alterar, bloqueie (Win+L) e desbloqueie o computador para replicar no domínio.\n' +
      '5) Se aparecer bloqueio, aguarde 15 minutos e tente de novo. Persistindo, abra chamado com print do erro.',
    tags: ['senha', 'bloqueio', 'login', 'ad'],
  },
  {
    id: 'faq-rede-sem-internet',
    title: 'Sem internet no Wi-Fi da empresa',
    category: 'Rede',
    content:
      'Checklist rápido de rede:\n' +
      '1) Confirme Wi-Fi ligado e modo avião desligado. Desconecte/reconecte à rede corporativa.\n' +
      '2) Se estiver em home office, reinicie o roteador e o computador. Teste outra rede (ex.: hotspot).\n' +
      '3) Esqueça a rede e refaça o login com usuário/senha corretos; confirme se a VPN não está bloqueando.\n' +
      '4) No Windows, rode "Solucionar problemas de rede" e verifique se há proxy configurado.\n' +
      '5) Sem sucesso: anote SSID, mensagem exibida, hora do teste e abra um chamado.',
    tags: ['wifi', 'rede', 'vpn', 'conexão'],
  },
  {
    id: 'faq-windows-lento',
    title: 'Windows lento ou travando',
    category: 'Software',
    content:
      'Como melhorar o desempenho:\n' +
      '1) Reinicie o equipamento e feche apps pesados no Gerenciador de Tarefas (CPU/Memória/Disco altos).\n' +
      '2) Desative inicialização automática de programas não essenciais (Gerenciador de Tarefas > Inicializar).\n' +
      '3) Limpe arquivos temporários e garanta pelo menos 10 GB livres em disco.\n' +
      '4) Instale atualizações pendentes do Windows e do antivírus, depois reinicie novamente.\n' +
      '5) Se continuar lento, registre hora, app afetado, prints do uso de recursos e abra chamado.',
    tags: ['windows', 'desempenho', 'lento', 'travando'],
  },
  {
    id: 'faq-impressora-nao-imprime',
    title: 'Impressora não imprime',
    category: 'Hardware',
    content:
      'Verificações para voltar a imprimir:\n' +
      '1) Confirme energia, cabos, papel e insumos (tinta/toner). Veja se há alertas no visor.\n' +
      '2) Abra a fila de impressão: limpe trabalhos travados e certifique-se de que não está pausada.\n' +
      '3) Imprima uma página de teste. Se falhar, reinstale/atualize o driver da impressora.\n' +
      '4) Teste a impressora em outro computador ou conecte outra impressora ao seu para isolar o problema.\n' +
      '5) Ainda sem imprimir? Informe modelo, IP (se houver), cabo usado e a mensagem de erro ao suporte.',
    tags: ['impressora', 'hardware', 'fila', 'driver'],
  },
];

export async function getFaq(): Promise<FaqArticle[]> {
  try {
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
