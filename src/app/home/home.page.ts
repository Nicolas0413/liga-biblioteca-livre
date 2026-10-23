import { NgFor } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../auth.service';
import { LivroCardComponent } from '../components/livro-card/livro-card.component';
import { LivroService } from '../livro.service';
import {
  AvaliacaoEvento, FILTROS_LIVRO, FiltroLivro, Livro, MSG_VAZIO, ORDENS_LIVRO,
  OrdemLivro, ResultadoAcao,
} from '../models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    NgFor,
    IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar,
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
  mensagemVazio = computed(() => MSG_VAZIO[this.filtro()]);
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
}