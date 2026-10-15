import {DatePipe,DecimalPipe} from '@angular/common';
import {ChangeDetectionStrategy,Component,computed,input,output} from '@angular/core';
import {PullRequestRecord,RECOMMENDATIONS,Recommendation,recurringChecks,summarize} from './decision-model';
@Component({selector:'app-decision-chart',imports:[DatePipe,DecimalPipe],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./decision-chart.component.html',styleUrl:'./decision-chart.component.css'})
export class DecisionChartComponent{
 readonly kind=input('causes');readonly records=input.required<PullRequestRecord[]>();readonly minimumCoverage=input(80);readonly pick=output<{kind:string;value:string}>();readonly labels=RECOMMENDATIONS;
 readonly trendKeys:('approved'|'rejected'|'awaiting')[]=['approved','rejected','awaiting'];
 readonly verdicts:Recommendation[]=['ready','review','blocked','pending'];
 readonly summary=computed(()=>summarize(this.records(),this.minimumCoverage()));
 readonly rows=computed(()=>{
  if(this.kind()==='causes')return recurringChecks(this.records(),this.minimumCoverage()).map(row=>({id:row.id,name:row.name,value:row.count}));
  if(this.kind()==='coverage')return [...new Set(this.records().map(pr=>pr.repo))].map(repo=>({id:repo,name:repo,value:summarize(this.records().filter(pr=>pr.repo===repo),this.minimumCoverage()).coverage})).filter((row):row is {id:string;name:string;value:number}=>row.value!==null).sort((a,b)=>a.value-b.value);
  return [...new Set(this.records().map(pr=>pr.project))].map(project=>({id:project,name:project,value:summarize(this.records().filter(pr=>pr.project===project),this.minimumCoverage()).blocked})).sort((a,b)=>b.value-a.value);
 });
 readonly maximum=computed(()=>this.kind()==='coverage'?100:Math.max(1,...this.rows().map(row=>row.value)));
 readonly donut=computed(()=>{const summary=this.summary();if(!summary.total)return 'conic-gradient(#e5e7eb 0deg 360deg)';const colors=['#168067','#be871f','#be2c2a','#8593a5'];let end=0;return 'conic-gradient('+this.verdicts.map((key,index)=>{const start=end;end+=summary[key]/summary.total*360;return `${colors[index]} ${start}deg ${end}deg`;}).join(',')+')';});
 readonly months=computed(()=>[...new Set(this.records().map(pr=>pr.date.slice(0,7)))].sort().map(month=>({date:month+'-01T00:00:00Z',...summarize(this.records().filter(pr=>pr.date.startsWith(month)),this.minimumCoverage())})));
 readonly trendMax=computed(()=>this.kind()==='pr-trend'?100:Math.max(1,...this.months().map(month=>month.total)));
 readonly series=computed(()=>this.kind()==='pr-trend'?this.records()[0]?.history.flatMap(point=>point.coverage===null?[]:[{date:point.date,value:point.coverage,commit:point.commit}])??[]:[]);
 points(key:'approved'|'rejected'|'awaiting'):string{return this.months().map((month,index)=>`${55+index/Math.max(1,this.months().length-1)*500},${175-month[key]/this.trendMax()*135}`).join(' ');}
 historyX(date:string):number{const series=this.series();return series.length===1?305:55+(Date.parse(date)-Date.parse(series[0]?.date??''))/Math.max(1,Date.parse(series.at(-1)?.date??'')-Date.parse(series[0]?.date??''))*500;}
 historyPoints():string{const series=this.series();const first=Date.parse(series[0]?.date??'');const last=Date.parse(series.at(-1)?.date??'');return series.map(point=>`${series.length===1?305:55+(Date.parse(point.date)-first)/Math.max(1,last-first)*500},${175-point.value/100*135}`).join(' ');}
}