import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy,Component,computed,input,signal} from '@angular/core';
import {AuditChartComponent} from './audit-chart.component';
import {DecisionChartComponent} from './decision-chart.component';
import {PullRequestRecord,RECOMMENDATIONS,evaluatePr,recommendation} from './decision-model';
@Component({selector:'app-decision-report',imports:[DatePipe,DecisionChartComponent,AuditChartComponent],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./decision-report.component.html',styleUrl:'./decision-report.component.css'})
export class DecisionReportComponent{
 readonly pr=input.required<PullRequestRecord>();readonly minimumCoverage=input(80);readonly checks=computed(()=>evaluatePr(this.pr(),this.minimumCoverage()));readonly verdict=computed(()=>recommendation(this.checks()));readonly labels=RECOMMENDATIONS;readonly passed=computed(()=>this.checks().filter(check=>check.status==='passed').length);readonly tab=signal('checks');
 readonly statuses:Record<string,string>={passed:'Conforme',warning:'Advertencia',failed:'No conforme',pending:'Pendiente'};
 readonly outcomes:Record<string,string>={approved:'Aprobado registrado',rejected:'Rechazado registrado',pending:'Sin decisión registrada'};
}