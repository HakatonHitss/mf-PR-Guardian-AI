import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PrReviewComponent } from './pr-review.component';
import { HuaweiAiService } from './huawei-ai.service';

@Component({selector:'app-huawei-ai',imports:[FormsModule,RouterLink,PrReviewComponent],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./huawei-ai.component.html',styleUrl:'./huawei-ai.component.css'})
export class HuaweiAiComponent {
  readonly configuration=input(false);
  readonly ai=inject(HuaweiAiService);
  readonly question=signal('');
  readonly code=signal('');
  readonly includeContext=signal(false);
  readonly includePullRequest=signal(false);
  constructor(){effect(()=>{this.ai.prReview.selectedKey();this.includePullRequest.set(false);});}
  async send(prompt=this.question()):Promise<void> {if(await this.ai.ask(prompt,this.code(),this.includeContext(),this.includePullRequest())) this.question.set('');}
}