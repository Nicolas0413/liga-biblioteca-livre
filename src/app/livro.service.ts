import { Injectable, computed, isDevMode, signal } from '@angular/core';
import {
  collection, doc, getDocs, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  FiltroLivro, LIMITE_EMPRESTIMOS, Livro, OrdemLivro, RegistroEmprestimo,
  ResultadoAcao, ResultadoAvaliacao, ResultadoEmprestimo, ROTULO_STATUS,
  StatusLivro, TotaisLivros,
} from './models';

const LIVROS_INICIAIS: Livro[] = [
  { id: '1', titulo: 'Ordem Paranormal RPG', status: 'disponivel', nota: 4, capa: 'assets/capas/ordem_paranormal.jpg' },
  { id: '2', titulo: 'Vampiro a Máscara', status: 'disponivel', nota: 5, capa: 'assets/capas/vampiro_a_mascara.jpg' },
  { id: '3', titulo: 'Umineko When They Cry', status: 'disponivel', nota: 5, capa: 'assets/capas/umineko.jpg' },
  { id: '4', titulo: 'Fábula Última', status: 'disponivel', nota: null, capa: 'assets/capas/fabula_ultima.jpg' },
  { id: '5', titulo: 'Tormenta 20', status: 'disponivel', nota: 4, capa: 'assets/capas/tormenta_20.jpg' },
  { id: '6', titulo: 'Dungeons & Dragons: Livro do Jogador', status: 'disponivel', nota: 5, capa: 'assets/capas/dnd.jpg' },
  { id: '7', titulo: 'Call of Cthulhu', status: 'disponivel', nota: 4, capa: 'assets/capas/call_of_cthulhu.jpg' },
  { id: '8', titulo: 'Cyberpunk RED', status: 'disponivel', nota: 3, capa: 'assets/capas/cyberpunk.jpg' },
  { id: '9', titulo: '3DeT', status: 'disponivel', nota: null, capa: 'assets/capas/3det.jpg' },
  { id: '10', titulo: 'Assimilação', status: 'disponivel', nota: 4, capa: 'assets/capas/assimilacao.jpg' },
  { id: '11', titulo: 'Som das Seis', status: 'disponivel', nota: 3, capa: 'assets/capas/som_das_seis.jpg' },
  { id: '12', titulo: 'Mago: A Ascensão', status: 'indisponivel', nota: null, capa: 'assets/capas/mago_a_ascensao.jpg' },
];

@Injectable({ providedIn: 'root' })
export class LivroService {
  private readonly _livros = signal<Livro[]>(LIVROS_INICIAIS.map((l) => ({ ...l })));
  private readonly _filtro = signal<FiltroLivro>('todos');
  private readonly _ordem = signal<OrdemLivro>('padrao');
  private readonly _uid = signal<string | null>(null);
  private readonly _busca = signal<string>('');
  readonly busca = this._busca.asReadonly();

  readonly livros = this._livros.asReadonly();
  readonly filtro = this._filtro.asReadonly();
  readonly ordem = this._ordem.asReadonly();
  readonly uid = this._uid.asReadonly();

  readonly livrosFiltrados = computed<Livro[]>(() => {
    const f = this._filtro();
    const termo = this.normalizar(this._busca());

    const base = this._livros().filter((l) =>
      (f === 'todos' || l.status === f) &&
      (termo === '' || this.normalizar(l.titulo).includes(termo)),
    );
    return this.ordenar(base, this._ordem());
  });

  readonly totais = computed<TotaisLivros>(() => {
    const lista = this._livros();
    const conta = (s: Livro['status']) => lista.filter((l) => l.status === s).length;
    return {
      total: lista.length,
      disponiveis: conta('disponivel'),
      emprestados: conta('emprestado'),
      indisponiveis: conta('indisponivel'),
    };
  });

  readonly esgotado = computed<boolean>(() => {
    const t = this.totais();
    return t.total > 0 && t.disponiveis === 0;
  });

  readonly meusEmprestimos = computed<number>(() => this.contarDe(this._uid()));

  constructor() {
    if (isDevMode()) {
      (window as any).reiniciarBiblioteca = () => this.reiniciarBanco();
    }
  }

  definirFiltro(filtro: FiltroLivro): void { this._filtro.set(filtro); }
  definirOrdem(ordem: OrdemLivro): void { this._ordem.set(ordem); }
  definirBusca(texto: string): void {
  this._busca.set(texto ?? '');
  }

  souDono(livro: Livro): boolean {
    const uid = this._uid();
    return livro.status === 'emprestado' && !!uid && livro.emprestadoPor === uid;
  }

  async carregar(): Promise<void> {
    this._uid.set(auth.currentUser?.uid ?? null);
    try {
      const snap = await getDocs(collection(db, 'livros'));
      const salvos = new Map<string, { status: StatusLivro; por: string | null }>();
      snap.forEach((d) => {
        const dados = d.data();
        const status = dados['status'];
        if (typeof status === 'string' && status in ROTULO_STATUS) {
          salvos.set(d.id, {
            status: status as StatusLivro,
            por: typeof dados['emprestadoPor'] === 'string' ? dados['emprestadoPor'] : null,
          });
        }
      });
      this._livros.update((lista) =>
        lista.map((l) => {
          const s = salvos.get(l.id);
          return s ? { ...l, status: s.status, emprestadoPor: s.por } : l;
        }),
      );
    } catch (e) {
      console.warn('Firestore indisponível, usando a lista local', e);
    }
  }

  async emprestar(id: string): Promise<ResultadoEmprestimo> {
    const livro = this._livros().find((l) => l.id === id);
    const usuario = auth.currentUser;

    if (!livro) return { ok: false, mensagem: 'Livro não encontrado' };
    if (!usuario) return { ok: false, mensagem: 'Faça login para pegar livros emprestados' };
    if (livro.status === 'emprestado') return { ok: false, mensagem: 'Este livro já está emprestado' };
    if (livro.status === 'indisponivel') return { ok: false, mensagem: 'Este livro está indisponível' };
    if (this.contarDe(usuario.uid) >= LIMITE_EMPRESTIMOS) {
      return {
        ok: false,
        mensagem: `Limite de ${LIMITE_EMPRESTIMOS} livros emprestados atingido. Devolva um para pegar outro.`,
      };
    }

    return this.gravar(livro, 'emprestar', 'emprestado', usuario.uid, 'Empréstimo registrado');
  }

  async devolver(id: string): Promise<ResultadoAcao> {
    const livro = this._livros().find((l) => l.id === id);
    const usuario = auth.currentUser;

    if (!livro) return { ok: false, mensagem: 'Livro não encontrado' };
    if (!usuario || livro.status !== 'emprestado' || livro.emprestadoPor !== usuario.uid) {
      return { ok: false, mensagem: 'Só quem pegou o livro pode devolvê-lo' };
    }

    return this.gravar(livro, 'devolver', 'disponivel', null, 'Devolução registrada');
  }

  avaliar(id: string, nota: number): ResultadoAvaliacao {
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      return { ok: false, mensagem: 'A nota deve ser de 1 a 5 estrelas' };
    }
    const livro = this._livros().find((l) => l.id === id);
    if (!livro) return { ok: false, mensagem: 'Livro não encontrado' };

    this.atualizar(id, { nota });
    const plural = nota === 1 ? 'estrela' : 'estrelas';
    return { ok: true, mensagem: `${livro.titulo}: ${nota} ${plural} registrada` };
  }

  async reiniciarBanco(): Promise<void> {
    const lote = writeBatch(db);
    for (const l of LIVROS_INICIAIS) {
      lote.set(doc(db, 'livros', l.id), {
        titulo: l.titulo,
        status: l.status,
        emprestadoPor: null,
      });
    }
    const antigos = await getDocs(collection(db, 'emprestimos'));
    antigos.forEach((d) => lote.delete(d.ref));
    await lote.commit();

    this._livros.set(LIVROS_INICIAIS.map((l) => ({ ...l })));
    console.log('Biblioteca reiniciada');
  }

  private async gravar(
    livro: Livro,
    acao: 'emprestar' | 'devolver',
    novoStatus: StatusLivro,
    novoDono: string | null,
    msgOk: string,
  ): Promise<ResultadoAcao> {
    const anterior = { status: livro.status, emprestadoPor: livro.emprestadoPor ?? null };
    this.atualizar(livro.id, { status: novoStatus, emprestadoPor: novoDono });

    const usuario = auth.currentUser;
    const registro: RegistroEmprestimo = {
      livroId: livro.id,
      titulo: livro.titulo,
      acao,
      statusAnterior: anterior.status,
      status: novoStatus,
      usuarioUid: usuario?.uid ?? null,
      usuarioEmail: usuario?.email ?? null,
      totais: this.totais(),
    };

    try {
      const lote = writeBatch(db);
      lote.set(
        doc(db, 'livros', livro.id),
        { titulo: livro.titulo, status: novoStatus, emprestadoPor: novoDono },
        { merge: true },
      );
      lote.set(doc(collection(db, 'emprestimos')), { ...registro, criadoEm: serverTimestamp() });
      await lote.commit();
      return { ok: true, mensagem: msgOk };
    } catch (e) {
      this.atualizar(livro.id, anterior);
      console.error('Erro ao gravar', e);
      return { ok: false, mensagem: 'Não foi possível gravar. Tente de novo.' };
    }
  }

  private contarDe(uid: string | null): number {
    if (!uid) return 0;
    return this._livros().filter((l) => l.status === 'emprestado' && l.emprestadoPor === uid).length;
  }

  private atualizar(id: string, mudanca: Partial<Livro>): void {
    this._livros.update((lista) => lista.map((l) => (l.id === id ? { ...l, ...mudanca } : l)));
  }

  private ordenar(lista: Livro[], ordem: OrdemLivro): Livro[] {
    if (ordem === 'padrao') return lista;
    const sinal = ordem === 'maior' ? -1 : 1;
    const porTitulo = (a: Livro, b: Livro) => a.titulo.localeCompare(b.titulo, 'pt-BR');

    return [...lista].sort((a, b) => {
      if (a.nota === null && b.nota === null) return porTitulo(a, b);
      if (a.nota === null) return 1;
      if (b.nota === null) return -1;
      return (a.nota - b.nota) * sinal || porTitulo(a, b);
    });
  }
  
  private normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  }
}