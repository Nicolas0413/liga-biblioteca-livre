export type StatusLivro = 'disponivel' | 'emprestado' | 'indisponivel';

export interface Livro {
  id: string;
  titulo: string;
  status: StatusLivro;
  nota: number | null;
  capa?: string;
  emprestadoPor?: string | null;
}

export const ROTULO_STATUS: Record<StatusLivro, string> = {
  disponivel: 'disponível',
  emprestado: 'emprestado',
  indisponivel: 'indisponível',
};

export type FiltroLivro = 'todos' | StatusLivro;

export interface TotaisLivros {
  total: number;
  disponiveis: number;
  emprestados: number;
  indisponiveis: number;
}

export interface ResultadoAcao {
  ok: boolean;
  mensagem: string;
}
export type ResultadoEmprestimo = ResultadoAcao;
export type ResultadoAvaliacao = ResultadoAcao;

export interface AvaliacaoEvento {
  id: string;
  nota: number;
}

export const FILTROS_LIVRO: { valor: FiltroLivro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'disponivel', rotulo: 'Disponíveis' },
  { valor: 'emprestado', rotulo: 'Emprestados' },
  { valor: 'indisponivel', rotulo: 'Indisponíveis' },
];

export const MSG_VAZIO: Record<FiltroLivro, string> = {
  todos: 'Nenhum livro na estante',
  disponivel: 'Nenhum livro disponível agora',
  emprestado: 'Nenhum livro emprestado',
  indisponivel: 'Nenhum livro indisponível',
};

export type OrdemLivro = 'padrao' | 'maior' | 'menor';

export const ORDENS_LIVRO: { valor: OrdemLivro; rotulo: string }[] = [
  { valor: 'padrao', rotulo: 'Padrão' },
  { valor: 'maior', rotulo: '★ Mais estrelas' },
  { valor: 'menor', rotulo: '★ Menos estrelas' },
];

export const LIMITE_EMPRESTIMOS = 2;

export interface RegistroEmprestimo {
  livroId: string;
  titulo: string;
  acao: 'emprestar' | 'devolver';  
  statusAnterior: StatusLivro;
  status: StatusLivro;
  usuarioUid: string | null;
  usuarioEmail: string | null;
  totais: TotaisLivros;
}




