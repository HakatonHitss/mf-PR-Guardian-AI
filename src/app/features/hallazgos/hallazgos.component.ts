import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspacePageComponent } from '../../shared/workspace-page.component';
@Component({
    selector: 'app-mf-pr-guardian-ai-hallazgos', imports: [WorkspacePageComponent], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-mf-pr-guardian-ai-workspace-page kind="hallazgos" title="Hallazgos y vulnerabilidades" description="Identifica riesgos y prioriza las correcciones." eyebrow="Seguridad y calidad" />`
})
export class FindingsComponent {
}
