import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspacePageComponent } from '../../shared/workspace-page.component';
@Component({
    selector: 'app-mf-pr-guardian-ai-proyectos', imports: [WorkspacePageComponent], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-mf-pr-guardian-ai-workspace-page kind="proyectos" title="Proyectos y repositorios" description="Todos tus repositorios y su salud en un solo lugar." eyebrow="Tu ecosistema de desarrollo" />`
})
export class ProjectsComponent {
}
