import {DatePipe,DecimalPipe} from '@angular/common';
import {ChangeDetectionStrategy,Component,computed,input,output} from '@angular/core';
import {PullRequestRecord,evaluatePr,summarize} from './decision-model';
import {controlTotals,findingsFor,SEVERITIES,Severity} from './audit-insights';
@Component({selector:'app-audit-chart',imports:[DatePipe,DecimalPipe],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./audit-chart.component.html',styleUrl:'./audit-chart.component.css'})
export class AuditChartComponent{
 readonly kind=input('severity');readonly records=input.required<PullRequestRecord[]>();readonly minimumCoverage=input(80);readonly pick=output<Severity>();readonly severities=SEVERITIES;readonly levels:Severity[]=['critical','high','medium','low'];readonly colors=['#2474b8','#287f6d','#8a63ad','#e18124'];
 readonly findings=computed(()=>this.records().flatMap(pr=>findingsFor(pr,this.minimumCoverage())));
 readonly distribution=computed(()=>this.levels.map(key=>({key,...SEVERITIES[key],count:this.findings().filter(item=>item.severity===key).length})));
 readonly donut=computed(()=>{let angle=0;const total=this.findings().length;return total?'conic-gradient('+this.distribution().map(item=>{const start=angle;angle+=item.count/total*360;return `${item.color} ${start}deg ${angle}deg`;}).join(',')+')':'conic-gradient(#287f6d 0deg 360deg)';});
 readonly controls=computed(()=>controlTotals(this.records(),this.minimumCoverage()));
 readonly months=computed(()=>[...new Set(this.records().map(pr=>pr.date.slice(0,7)))].sort());
 readonly coverageSeries=computed(()=>[...new Set(this.records().map(pr=>pr.project))].slice(0,4).map((project,index)=>({project,color:this.colors[index],points:this.months().map(month=>({month,value:summarize(this.records().filter(pr=>pr.project===project&&pr.date.startsWith(month)),this.minimumCoverage()).coverage}))})));
 readonly currentChecks=computed(()=>this.records()[0]?evaluatePr(this.records()[0],this.minimumCoverage()):[]);
 readonly coverage=computed(()=>{const pr=this.records()[0];return pr&&pr.sonar.commit===pr.commit?pr.sonar.coverage:null;});
 x(index:number):number{return this.months().length===1?305:55+index/Math.max(1,this.months().length-1)*500;}
 y(value:number):number{return 175-value*1.35;}
 segments(points:{value:number|null}[]):string[]{const segments:string[]=[];let segment:string[]=[];points.forEach((point,index)=>{if(point.value===null){if(segment.length)segments.push(segment.join(' '));segment=[];}else segment.push(`${this.x(index)},${this.y(point.value)}`);});if(segment.length)segments.push(segment.join(' '));return segments;}
}
