import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { InicioSesion } from './pages/inicio-sesion/inicio-sesion';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'inicio-sesion', component: InicioSesion },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: '**', redirectTo: '' }  // Redirige cualquier ruta no válida al inicio
];

