import { NgFor } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonSearchbar, IonTitle, IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../auth.service';
import { LivroCardComponent } from '../components/livro-card/livro-card.component';
import { LivroService } from '../livro.service';
import {
  AvaliacaoEvento, FILTROS_LIVRO, FiltroLivro, Livro, MSG_VAZIO, ORDENS_LIVRO,
  OrdemLivro, ResultadoAcao, LIMITE_EMPRESTIMOS, 
} from '../models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    NgFor,
    IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, IonSearchbar,
    LivroCardComponent,
  ],
})
export class HomePage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private livroService = inject(LivroService);

  livros = this.livroService.livrosFiltrados;
  totais = this.livroService.totais;
  filtro = this.livroService.filtro;
  ordem = this.livroService.ordem;
  esgotado = this.livroService.esgotado;

  filtros = FILTROS_LIVRO;
  ordens = ORDENS_LIVRO;
  mensagemVazio = computed(() =>
  this.busca().trim()
    ? `Nenhum livro encontrado para "${this.busca().trim()}"`
    : MSG_VAZIO[this.filtro()],
  );
  aviso = signal<ResultadoAcao | null>(null);

  ngOnInit() {
    this.livroService.carregar();
  }

  porId(_: number, livro: Livro) {
    return livro.id;
  }

  filtrar(f: FiltroLivro) {
    this.livroService.definirFiltro(f);
  }

  ordenar(o: OrdemLivro) {
    this.livroService.definirOrdem(o);
  }

  busca = this.livroService.busca;

  pesquisar(texto: string | null | undefined) {
  this.livroService.definirBusca(texto ?? '');
  }
  
  async emprestar(id: string) {
    this.aviso.set(await this.livroService.emprestar(id));
  }

  avaliar(e: AvaliacaoEvento) {
    this.aviso.set(this.livroService.avaliar(e.id, e.nota));
  }

  async sair() {
    await this.auth.sair();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  meus = this.livroService.meusEmprestimos;
  limite = LIMITE_EMPRESTIMOS;

  souDono(livro: Livro) {
    return this.livroService.souDono(livro);
  }

  async devolver(id: string) {
    this.aviso.set(await this.livroService.devolver(id));
  }
}



