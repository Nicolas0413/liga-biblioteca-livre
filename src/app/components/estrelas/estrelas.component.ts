import { NgFor } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-estrelas',
  templateUrl: './estrelas.component.html',
  styleUrls: ['./estrelas.component.scss'],
  imports: [NgFor],
})
export class EstrelasComponent {
  /** Nota atual (1 a 5) ou null quando o livro ainda não tem nota. */
  @Input() nota: number | null = null;

  /** Emite a estrela escolhida pelo usuário. */
  @Output() avaliar = new EventEmitter<number>();

  valores = [1, 2, 3, 4, 5];

  escolher(valor: number) {
    this.avaliar.emit(valor);
  }
}
