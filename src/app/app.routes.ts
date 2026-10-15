import { Routes } from '@angular/router';
export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'bitbucket', redirectTo: 'configuracion', pathMatch: 'full' },
    { path: 'arquetipos', title: 'Arquetipos · PR Guardian AI', loadComponent: () => import('./features/archetypes/archetypes.component').then(m => m.ArchetypesComponent) },
    { path: 'dashboard', title: 'Dashboard general · PR Guardian AI', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
    { path: 'pull-requests', title: 'Pull Requests · PR Guardian AI', loadComponent: () => import('./features/pull-requests/pull-requests.component').then(m => m.PullRequestsComponent) },
    { path: 'hallazgos', title: 'Hallazgos y vulnerabilidades · PR Guardian AI', loadComponent: () => import('./features/hallazgos/hallazgos.component').then(m => m.FindingsComponent) },
    { path: 'cobertura', title: 'Cobertura de pruebas · PR Guardian AI', loadComponent: () => import('./features/cobertura/cobertura.component').then(m => m.CoverageComponent) },
    { path: 'asistente', title: 'Asistente de IA · PR Guardian AI', loadComponent: () => import('./features/asistente/asistente.component').then(m => m.AssistantComponent) },
    { path: 'historial', title: 'Historial y comparaciones · PR Guardian AI', loadComponent: () => import('./features/historial/historial.component').then(m => m.HistoryComponent) },
    { path: 'proyectos', title: 'Proyectos y repositorios · PR Guardian AI', loadComponent: () => import('./features/proyectos/proyectos.component').then(m => m.ProjectsComponent) },
    { path: 'reportes', title: 'Reportes y métricas · PR Guardian AI', loadComponent: () => import('./features/reportes/reportes.component').then(m => m.ReportsComponent) },
    { path: 'configuracion', title: 'Configuración · PR Guardian AI', loadComponent: () => import('./features/configuracion/configuracion.component').then(m => m.SettingsComponent) },
    { path: 'default', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'template', redirectTo: 'pull-requests', pathMatch: 'full' },
    { path: '**', redirectTo: 'dashboard' }
];
