import {ChangeDetectionStrategy,Component,computed,inject,input,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {DecisionStore} from './decision.store';
import {evaluatePr,recommendation,RECOMMENDATIONS} from './decision-model';
import {STATUS_LABELS} from './audit-insights';
@Component({selector:'app-review-tools',imports:[FormsModule,RouterLink],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./review-tools.component.html',styleUrl:'./review-tools.component.css'})
export class ReviewToolsComponent{
 readonly view=input('asistente');readonly store=inject(DecisionStore);readonly query=signal('');readonly answer=signal('');readonly saved=signal(false);readonly selected=computed(()=>this.store.records().find(pr=>pr.key===this.store.selectedKey())??this.store.records().at(-1)!);
 select(key:string):void{this.store.selectedKey.set(key);this.answer.set('');}
 ask(question=this.query()):void{if(!question.trim())return;this.query.set(question);const pr=this.selected();const checks=evaluatePr(pr,this.store.minimumCoverage());const topic=/cobertura|prueba/i.test(question)?['coverage','tests']:/arquetipo|estructura/i.test(question)?['archetype']:/jenkins|pipeline|build/i.test(question)?['jenkins','tests','commit']:/seguridad|vulnerab|sonar/i.test(question)?['security','bugs','sonar']:checks.map(check=>check.id);const details=checks.filter(check=>topic.includes(check.id));this.answer.set(`PR #${pr.id} · ${pr.repo}\n${RECOMMENDATIONS[recommendation(checks)].label}\n\n`+details.map(check=>`${STATUS_LABELS[check.status]} · ${check.label}\n${check.evidence}${check.status!=='passed'?'\nAcción: '+check.action:''}`).join('\n\n')+(topic.includes('archetype')&&pr.archetype.differences.length?'\n\nDiferencias:\n'+pr.archetype.differences.map(item=>`${item.path}: ${item.actual}. ${item.fix}`).join('\n'):''));}
 apply(value:string):void{this.store.minimumCoverage.set(Number(value));this.saved.set(true);}
}
