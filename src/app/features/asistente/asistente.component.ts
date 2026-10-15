import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspacePageComponent } from '../../shared/workspace-page.component';
@Component({
    selector: 'app-mf-pr-guardian-ai-asistente', imports: [WorkspacePageComponent], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-mf-pr-guardian-ai-workspace-page kind="asistente" title="Asistente de IA" description="Explora tus hallazgos y encuentra el siguiente paso." eyebrow="Tu copiloto de seguridad" />`
})
export class AssistantComponent {
}
