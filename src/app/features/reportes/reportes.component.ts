import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspacePageComponent } from '../../shared/workspace-page.component';
@Component({
    selector: 'app-mf-pr-guardian-ai-reportes', imports: [WorkspacePageComponent], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-mf-pr-guardian-ai-workspace-page kind="reportes" title="Reportes y métricas" description="Convierte tus auditorías en decisiones." eyebrow="Visibilidad para tu equipo" />`
})
export class ReportsComponent {
}
