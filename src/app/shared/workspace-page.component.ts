import {ChangeDetectionStrategy,Component,input} from '@angular/core';
import {DecisionWorkspaceComponent} from '../features/decisions/decision-workspace.component';
import {ReviewToolsComponent} from '../features/decisions/review-tools.component';
@Component({selector:'app-mf-pr-guardian-ai-workspace-page',imports:[DecisionWorkspaceComponent,ReviewToolsComponent],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./workspace-page.component.html',styleUrl:'./workspace-page.component.css'})
export class WorkspacePageComponent {
 readonly kind=input.required<string>();readonly title=input.required<string>();readonly description=input.required<string>();readonly eyebrow=input.required<string>();
}
