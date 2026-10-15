import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PrReviewService } from './pr-review.service';
@Component({selector:'app-pr-review',imports:[FormsModule,RouterLink,DatePipe],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./pr-review.component.html',styleUrl:'./pr-review.component.css'})
export class PrReviewComponent {
  readonly data=inject(PrReviewService);
  readonly query=signal('');
  readonly fileQuery=signal('');
  readonly tab=signal('files');
  readonly prs=computed(()=>this.data.bb.pullRequests().filter(pr=>`${pr.id} ${pr.title} ${pr.toRef.repository.slug} ${pr.toRef.repository.project.key}`.toLocaleLowerCase().includes(this.query().trim().toLocaleLowerCase())));
  readonly files=computed(()=>(this.data.review()?.files??[]).filter(file=>`${file.path} ${file.oldPath??''} ${file.type}`.toLocaleLowerCase().includes(this.fileQuery().trim().toLocaleLowerCase())));
  readonly types:Partial<Record<string,string>>={ADD:'Agregado',MODIFY:'Modificado',DELETE:'Eliminado',MOVE:'Renombrado / movido',COPY:'Copiado'};
  select(key:string):void{this.data.select(key);this.fileQuery.set('');this.tab.set('files');}
}