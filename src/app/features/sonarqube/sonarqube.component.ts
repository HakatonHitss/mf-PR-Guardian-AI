import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SONAR_METRICS, SonarqubeService } from './sonarqube.service';

@Component({
  selector: 'app-sonarqube',
  imports: [FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sonarqube.component.html',
  styleUrl: './sonarqube.component.css'
})
export class SonarqubeComponent {
  readonly view = input('reportes');
  readonly query = signal('');
  readonly days = signal(90);
  readonly historyMetric = signal('');
  readonly sonar = inject(SonarqubeService);
  readonly labels: Record<string, string> = {
    alert_status: 'Quality Gate', bugs: 'Bugs', vulnerabilities: 'Vulnerabilidades', security_hotspots: 'Puntos de seguridad por revisar',
    code_smells: 'Code smells', coverage: 'Cobertura', duplicated_lines_density: 'Líneas duplicadas', ncloc: 'Líneas de código'
  };
  readonly metrics = computed(() => {
    const keys = this.view() === 'cobertura' ? ['coverage'] : this.view() === 'hallazgos' ? ['vulnerabilities', 'security_hotspots', 'bugs', 'code_smells'] : this.view() === 'dashboard' ? ['alert_status','coverage','vulnerabilities','ncloc'] : SONAR_METRICS;
    return keys.map(key => ({ key, label: this.labels[key], value: this.sonar.measures().find(m => m.metric === key)?.value }));
  });

  readonly filteredMetrics = computed(() => this.metrics().filter(metric => `${metric.label} ${metric.key}`.toLocaleLowerCase().includes(this.query().trim().toLocaleLowerCase())));
  readonly bars = computed(() => ['vulnerabilities','security_hotspots','bugs','code_smells'].flatMap(key => {
    const raw = this.sonar.measures().find(metric=>metric.metric===key)?.value;
    return raw !== undefined && raw.trim() && Number.isFinite(Number(raw)) && Number(raw)>=0 ? [{key,label:this.labels[key],value:Number(raw)}] : [];
  }));
  readonly barMax = computed(() => Math.max(1,...this.bars().map(bar=>bar.value)));
  readonly activeMetric = computed(() => this.historyMetric() || (this.view()==='cobertura' ? 'coverage' : 'vulnerabilities'));
  readonly visibleHistoryContext = computed(() => { const context = this.sonar.historyContext(); return context?.metric === this.activeMetric() && context.days === this.days() ? context : null; });
  readonly points = computed(() => {
    const history = this.sonar.history();
    const first = Date.parse(history[0]?.date ?? '');
    const last = Date.parse(history.at(-1)?.date ?? '');
    const ceiling = this.sonar.historyContext()?.metric === 'coverage' ? Math.max(100,...history.map(p=>p.value)) : Math.max(1,...history.map(p=>p.value));
    return history.map(point=>({...point,x:history.length===1 ? 330 : 50+(Date.parse(point.date)-first)/Math.max(1,last-first)*560,y:200-point.value/ceiling*160}));
  });
  readonly line = computed(() => this.points().map(point=>`${point.x},${point.y}`).join(' '));
  readonly chartMax = computed(() => this.sonar.historyContext()?.metric==='coverage' ? Math.max(100,...this.sonar.history().map(p=>p.value)) : Math.max(1,...this.sonar.history().map(p=>p.value)));
  loadHistory(): void { void this.sonar.loadHistory(this.activeMetric(),Number(this.days())); }
  export(): void {
    if (!this.sonar.result()) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ context: this.sonar.context(), ...this.sonar.result(), historyContext: this.sonar.historyContext(), history: this.sonar.history() }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'sonarqube-metricas.json'; link.click(); URL.revokeObjectURL(url);
  }
}