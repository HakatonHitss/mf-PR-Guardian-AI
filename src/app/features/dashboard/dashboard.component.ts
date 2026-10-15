import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspacePageComponent } from '../../shared/workspace-page.component';
@Component({
    selector: 'app-mf-pr-guardian-ai-dashboard', imports: [WorkspacePageComponent], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-mf-pr-guardian-ai-workspace-page kind="dashboard" title="Dashboard general" description="Vista general de seguridad y calidad." eyebrow="Panorama del workspace" />`
})
export class DashboardComponent {
}
