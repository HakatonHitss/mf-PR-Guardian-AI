import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspacePageComponent } from '../../shared/workspace-page.component';
@Component({
    selector: 'app-mf-pr-guardian-ai-pull-requests', imports: [WorkspacePageComponent], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-mf-pr-guardian-ai-workspace-page kind="pull-requests" title="Pull Requests" description="Prioriza revisiones y entrega código con confianza." eyebrow="Revisión de código" />`
})
export class PullRequestsComponent {
}
