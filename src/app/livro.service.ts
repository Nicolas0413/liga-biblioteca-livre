import { Injectable, computed, signal } from '@angular/core';
import {
  collection, doc, getDocs, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  FiltroLivro, Livro, OrdemLivro, RegistroEmprestimo, ResultadoAvaliacao,
  ResultadoEmprestimo, ROTULO_STATUS, StatusLivro, TotaisLivros,
} from './models';

@Injectable({ providedIn: 'root' })
export class LivroService {
  private readonly _livros = signal<Livro[]>([
    {
      id: '1', titulo: 'Ordem Paranormal RPG', status: 'disponivel', nota: 4,
      capa: 'assets/capas/ordem_paranormal.jpg',
    },
    {
      id: '2', titulo: 'Vampiro a Máscara', status: 'disponivel', nota: 5,
      capa: 'assets/capas/vampiro_a_mascara.jpg',
    },
    {
      id: '3', titulo: 'Umineko When They Cry', status: 'emprestado', nota: 2,
      capa: 'assets/capas/umineko.jpg',
    },
    {
      id: '4', titulo: 'Fábula Última', status: 'disponivel', nota: null,
      capa: 'assets/capas/fabula_ultima.jpg',
    },
    {
      id: '5', titulo: 'Tormenta 20', status: 'indisponivel', nota: 4,
      capa: 'assets/capas/tormenta_20.jpg',
    },
  ]);
  private readonly _filtro = signal<FiltroLivro>('todos');
  private readonly _ordem = signal<OrdemLivro>('padrao');

  readonly livros = this._livros.asReadonly();
  readonly filtro = this._filtro.asReadonly();
  readonly ordem = this._ordem.asReadonly();

  readonly livrosFiltrados = computed<Livro[]>(() => {
    const f = this._filtro();
    const base = f === 'todos'
      ? this._livros()
      : this._livros().filter((l) => l.status === f);
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

  definirFiltro(filtro: FiltroLivro): void {
    this._filtro.set(filtro);
  }

  definirOrdem(ordem: OrdemLivro): void {
    this._ordem.set(ordem);
  }

  async carregar(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'livros'));
      const salvos = new Map<string, StatusLivro>();
      snap.forEach((d) => {
        const status = d.data()['status'];
        if (typeof status === 'string' && status in ROTULO_STATUS) {
          salvos.set(d.id, status as StatusLivro);
        }
      });
      this._livros.update((lista) =>
        lista.map((l) => (salvos.has(l.id) ? { ...l, status: salvos.get(l.id)! } : l)),
      );
    } catch (e) {
      console.warn('Firestore indisponível, usando a lista local', e);
    }
  }


  async emprestar(id: string): Promise<ResultadoEmprestimo> {
    const livro = this._livros().find((l) => l.id === id);

    if (!livro) {
      return { ok: false, mensagem: 'Livro não encontrado' };
    }
    if (livro.status === 'emprestado') {
      return { ok: false, mensagem: 'Este livro já está emprestado' };
    }
    if (livro.status === 'indisponivel') {
      return { ok: false, mensagem: 'Este livro está indisponível' };
    }

    this.atualizar(id, { status: 'emprestado' });

    const usuario = auth.currentUser;
    const registro: RegistroEmprestimo = {
      livroId: livro.id,
      titulo: livro.titulo,
      acao: 'emprestar',
      statusAnterior: livro.status,
      status: 'emprestado',
      usuarioUid: usuario?.uid ?? null,
      usuarioEmail: usuario?.email ?? null,
      totais: this.totais(), 
    };

    try {
      const lote = writeBatch(db);
      lote.set(
        doc(db, 'livros', id),
        { titulo: livro.titulo, status: 'emprestado' },
        { merge: true },
      );
      lote.set(doc(collection(db, 'emprestimos')), {
        ...registro,
        criadoEm: serverTimestamp(),
      });
      await lote.commit();
      return { ok: true, mensagem: 'Empréstimo registrado' };
    } catch (e) {

      this.atualizar(id, { status: livro.status });
      console.error('Erro ao gravar empréstimo', e);
      return { ok: false, mensagem: 'Não foi possível gravar o empréstimo. Tente de novo.' };
    }
  }

  avaliar(id: string, nota: number): ResultadoAvaliacao {
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      return { ok: false, mensagem: 'A nota deve ser de 1 a 5 estrelas' };
    }
    const livro = this._livros().find((l) => l.id === id);
    if (!livro) {
      return { ok: false, mensagem: 'Livro não encontrado' };
    }

    this.atualizar(id, { nota });
    const plural = nota === 1 ? 'estrela' : 'estrelas';
    return {
      ok: true,
      mensagem: `${livro.titulo}: ${nota} ${plural} registrada`,
    };
  }

  private atualizar(id: string, mudanca: Partial<Livro>): void {
    this._livros.update((lista) =>
      lista.map((l) => (l.id === id ? { ...l, ...mudanca } : l)),
    );
  }

  private ordenar(lista: Livro[], ordem: OrdemLivro): Livro[] {
    if (ordem === 'padrao') {
      return lista;
    }
    const sinal = ordem === 'maior' ? -1 : 1;
    const porTitulo = (a: Livro, b: Livro) =>
      a.titulo.localeCompare(b.titulo, 'pt-BR');

    return [...lista].sort((a, b) => {
      if (a.nota === null && b.nota === null) return porTitulo(a, b);
      if (a.nota === null) return 1;
      if (b.nota === null) return -1;
      return (a.nota - b.nota) * sinal || porTitulo(a, b);
    });
  }
}