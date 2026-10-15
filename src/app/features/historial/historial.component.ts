import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspacePageComponent } from '../../shared/workspace-page.component';
@Component({
    selector: 'app-mf-pr-guardian-ai-historial', imports: [WorkspacePageComponent], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-mf-pr-guardian-ai-workspace-page kind="historial" title="Historial y comparaciones" description="Sigue la evolución de tus auditorías." eyebrow="Evolución continua" />`
})
export class HistoryComponent {
}
