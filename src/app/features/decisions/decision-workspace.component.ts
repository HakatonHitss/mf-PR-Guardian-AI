import {DatePipe,DecimalPipe} from '@angular/common';
import {ChangeDetectionStrategy,Component,computed,effect,inject,input,signal,untracked} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {AuditChartComponent} from './audit-chart.component';
import {findingsFor,SEVERITIES,STATUS_LABELS,Severity} from './audit-insights';
import {DecisionStore} from './decision.store';
import {DecisionChartComponent} from './decision-chart.component';
import {DecisionReportComponent} from './decision-report.component';
import {PullRequestRecord,RECOMMENDATIONS,Recommendation,evaluatePr,recommendation,summarize} from './decision-model';
import {csvReport,reportHtml,reportPayload} from './decision-exports';
@Component({selector:'app-decision-workspace',imports:[FormsModule,RouterLink,DatePipe,DecimalPipe,DecisionChartComponent,DecisionReportComponent,AuditChartComponent],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./decision-workspace.component.html',styleUrl:'./decision-workspace.component.css'})
export class DecisionWorkspaceComponent{
 readonly view=input('dashboard');readonly severities=SEVERITIES;readonly statuses=STATUS_LABELS;readonly severity=signal<Severity|''>('');readonly store=inject(DecisionStore);readonly labels=RECOMMENDATIONS;readonly keys:Recommendation[]=['ready','review','blocked','pending'];readonly routeError=signal('');readonly notice=signal('');
 private readonly route=inject(ActivatedRoute);private readonly params=toSignal(this.route.queryParamMap,{initialValue:this.route.snapshot.queryParamMap});
 readonly titles:Partial<Record<string,string>>={dashboard:'Dashboard de calidad y aprobación','pull-requests':'Reporte general del pull request',hallazgos:'Controles y errores recurrentes',cobertura:'Cobertura y evidencia de pruebas',arquetipos:'Diferencias de arquetipo',historial:'Decisiones y actividad del equipo',proyectos:'Calidad por proyecto',reportes:'Reportes y exportaciones'};
 readonly projectRows=computed(()=>[...new Set(this.store.filtered().map(pr=>pr.project))].map(project=>({project,...summarize(this.store.filtered().filter(pr=>pr.project===project),this.store.minimumCoverage())})));
 readonly findings=computed(()=>this.store.filtered().flatMap(pr=>findingsFor(pr,this.store.minimumCoverage())).filter(item=>!this.severity()||item.severity===this.severity()));
 readonly allFindings=computed(()=>this.store.filtered().flatMap(pr=>findingsFor(pr,this.store.minimumCoverage())));
 readonly compliance=computed(()=>{const checks=this.store.filtered().flatMap(pr=>evaluatePr(pr,this.store.minimumCoverage()));return checks.length?checks.filter(check=>check.status==='passed').length/checks.length*100:null;});
 readonly critical=computed(()=>this.allFindings().filter(item=>item.severity==='critical').length);
 readonly differences=computed(()=>this.store.filtered().flatMap(pr=>pr.archetype.differences.map(diff=>({pr,diff}))));
 readonly events=computed(()=>this.store.filtered().filter(pr=>pr.outcome!=='pending'));
 constructor(){effect(()=>{const key=this.params().get('pr');if(key)untracked(()=>{if(this.store.records().some(pr=>pr.key===key)){this.store.clearFilters();this.store.selectedKey.set(key);this.store.prKey.set(key);this.routeError.set('');}else this.routeError.set('El PR solicitado no existe en este conjunto de registros.');});});}
 clearFilters():void{this.store.clearFilters();this.severity.set('');}
 reset():void{this.store.reset();this.severity.set('');this.notice.set('');}
 verdictLabel(value:Recommendation|''):string{return value?this.labels[value].short:'';}
 verdict(pr:PullRequestRecord):Recommendation{return recommendation(evaluatePr(pr,this.store.minimumCoverage()));}
 choosePr(key:string):void{this.clearFilters();this.store.prKey.set(key);this.store.selectedKey.set(key);this.routeError.set('');}
 select(key:string):void{this.store.selectedKey.set(key);this.routeError.set('');}
 chartPick(event:{kind:string;value:string}):void{if(event.kind==='recommendation')this.store.verdict.set(event.value as Recommendation);else if(event.kind==='projects')this.store.project.set(event.value);else if(event.kind==='causes')this.store.category.set(event.value);else if(event.kind==='coverage')this.store.query.set(event.value);}
 download(content:string,name:string,type:string):void{const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);this.notice.set('Reporte exportado correctamente.');}
 exportPr(format:'html'|'json'):void{const pr=this.store.selected();if(!pr||this.routeError())return;this.download(format==='html'?reportHtml(pr,this.store.minimumCoverage()):JSON.stringify(reportPayload(pr,this.store.minimumCoverage()),null,2),`PR-${pr.repo}-${pr.id}.${format}`,format==='html'?'text/html;charset=utf-8':'application/json');}
 exportCsv():void{this.download(csvReport(this.store.filtered(),this.store.minimumCoverage()),'indicadores-PR.csv','text/csv;charset=utf-8');}
}