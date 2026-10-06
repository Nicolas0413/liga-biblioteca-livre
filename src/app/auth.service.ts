import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {

  usuario(): Promise<User | null> {
    return new Promise((resolve) => {
      const off = onAuthStateChanged(auth, (u) => {
        off();
        resolve(u);
      });
    });
  }

  cadastrar(email: string, senha: string) {
    return createUserWithEmailAndPassword(auth, email, senha);
  }

  entrar(email: string, senha: string) {
    return signInWithEmailAndPassword(auth, email, senha);
  }

  entrarComGoogle() {
    return signInWithPopup(auth, new GoogleAuthProvider());
  }

  sair() {
    return signOut(auth);
  }

  traduzirErro(code: string): string {
    const m: Record<string, string> = {
      'auth/invalid-email': 'E-mail inválido',
      'auth/missing-password': 'Informe a senha',
      'auth/weak-password': 'Senha fraca (mínimo 6 caracteres)',
      'auth/email-already-in-use': 'Este e-mail já está cadastrado',
      'auth/invalid-credential': 'E-mail ou senha incorretos',
      'auth/user-not-found': 'E-mail ou senha incorretos',
      'auth/wrong-password': 'E-mail ou senha incorretos',
      'auth/popup-closed-by-user': 'Login com Google cancelado',
      'auth/popup-blocked': 'O navegador bloqueou o popup',
      'auth/too-many-requests': 'Muitas tentativas, tente mais tarde',
    };
    return m[code] ?? 'Erro ao autenticar';
  }
}
