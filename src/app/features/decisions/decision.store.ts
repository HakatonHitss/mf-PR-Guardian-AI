import {Injectable,computed,signal} from '@angular/core';
import {createPrRecords} from './decision-mocks';
import {PullRequestRecord,Recommendation,developerStats,evaluatePr,recurringChecks,recommendation,summarize} from './decision-model';
@Injectable({providedIn:'root'})
export class DecisionStore{
 readonly records=signal(createPrRecords());
 readonly project=signal('');readonly developer=signal('');readonly month=signal('');readonly query=signal('');readonly prKey=signal('');readonly verdict=signal<Recommendation|''>('');readonly category=signal('');readonly selectedKey=signal('');readonly minimumCoverage=signal(80);
 readonly projects=computed(()=>[...new Set(this.records().map(pr=>pr.project))].sort());readonly authors=computed(()=>[...new Map(this.records().map(pr=>[pr.author.id,pr.author])).values()]);readonly months=computed(()=>[...new Set(this.records().map(pr=>pr.date.slice(0,7)))].sort());
 readonly filtered=computed(()=>this.records().filter(pr=>(!this.prKey()||pr.key===this.prKey())&&(!this.project()||pr.project===this.project())&&(!this.developer()||pr.author.id===this.developer())&&(!this.month()||pr.date.startsWith(this.month()))&&(!this.verdict()||recommendation(evaluatePr(pr,this.minimumCoverage()))===this.verdict())&&(!this.category()||evaluatePr(pr,this.minimumCoverage()).some(check=>check.id===this.category()&&(check.status==='failed'||check.status==='warning')))&&`${pr.id} ${pr.title} ${pr.repo} ${pr.project} ${pr.author.name}`.toLocaleLowerCase().includes(this.query().trim().toLocaleLowerCase())).sort((a,b)=>b.date.localeCompare(a.date)));
 readonly selected=computed<PullRequestRecord|null>(()=>this.filtered().find(pr=>pr.key===this.selectedKey())??this.filtered()[0]??null);
 readonly summary=computed(()=>summarize(this.filtered(),this.minimumCoverage()));readonly developers=computed(()=>developerStats(this.filtered(),this.minimumCoverage()));readonly causes=computed(()=>recurringChecks(this.filtered(),this.minimumCoverage()));
 clearFilters():void{this.project.set('');this.developer.set('');this.month.set('');this.query.set('');this.prKey.set('');this.verdict.set('');this.category.set('');}
 reset():void{this.records.set(createPrRecords());this.clearFilters();this.selectedKey.set('');this.minimumCoverage.set(80);}
}