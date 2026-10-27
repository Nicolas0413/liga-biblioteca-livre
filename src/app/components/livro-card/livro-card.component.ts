import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton } from '@ionic/angular';
import { AvaliacaoEvento, Livro, ROTULO_STATUS } from '../../models';
import { EstrelasComponent } from '../estrelas/estrelas.component';

@Component({
  selector: 'app-livro-card',
  templateUrl: './livro-card.component.html',
  styleUrls: ['./livro-card.component.scss'],
  imports: [IonButton, EstrelasComponent],
})
export class LivroCardComponent {
  @Input({ required: true }) livro!: Livro;

  @Output() emprestar = new EventEmitter<string>();

  @Output() avaliar = new EventEmitter<AvaliacaoEvento>();

  rotulo = ROTULO_STATUS;

  capaFalhou = false;

  pedirEmprestimo() {
    this.emprestar.emit(this.livro.id);
  }

  darNota(nota: number) {
    this.avaliar.emit({ id: this.livro.id, nota });
  }

  aoFalharCapa() {
    this.capaFalhou = true;
  }
  @Input() meu = false;
  @Output() devolver = new EventEmitter<string>();

  pedirDevolucao() {
    this.devolver.emit(this.livro.id);
  }
}

