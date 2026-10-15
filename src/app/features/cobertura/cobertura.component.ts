import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspacePageComponent } from '../../shared/workspace-page.component';
@Component({
    selector: 'app-mf-pr-guardian-ai-cobertura', imports: [WorkspacePageComponent], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-mf-pr-guardian-ai-workspace-page kind="cobertura" title="Cobertura de pruebas" description="Líneas, ramas y funciones bajo control." eyebrow="Calidad del código" />`
})
export class CoverageComponent {
}
