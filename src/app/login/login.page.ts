import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonHeader, IonInput, IonItem, IonList,
  IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    FormsModule, IonButton, IonContent, IonHeader, IonInput, IonItem, IonList,
    IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonTitle, IonToolbar,
  ],
})
export class LoginPage {
  modo: 'entrar' | 'cadastrar' = 'entrar';
  email = '';
  senha = '';
  erro = '';
  carregando = false;

  constructor(private auth: AuthService, private router: Router) {}

  async enviar() {
    await this.executar(() =>
      this.modo === 'entrar'
        ? this.auth.entrar(this.email.trim(), this.senha)
        : this.auth.cadastrar(this.email.trim(), this.senha),
    );
  }

  async google() {
    await this.executar(() => this.auth.entrarComGoogle());
  }

  private async executar(acao: () => Promise<unknown>) {
    this.erro = '';
    this.carregando = true;
    try {
      await acao();
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (e: any) {
      this.erro = this.auth.traduzirErro(e?.code ?? '');
    } finally {
      this.carregando = false;
    }
  }
}
