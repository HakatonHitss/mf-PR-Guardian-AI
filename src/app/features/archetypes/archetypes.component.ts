import {ChangeDetectionStrategy,Component} from '@angular/core';
import {DecisionWorkspaceComponent} from '../decisions/decision-workspace.component';
@Component({selector:'app-archetypes',imports:[DecisionWorkspaceComponent],changeDetection:ChangeDetectionStrategy.OnPush,template:'<app-decision-workspace view="arquetipos" />'})
export class ArchetypesComponent {}
