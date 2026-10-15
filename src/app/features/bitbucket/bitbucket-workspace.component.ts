import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Annotation, BitbucketConnectionService, Commit, InsightReport } from './bitbucket-connection.service';

@Component({
  selector: 'app-bitbucket-workspace',
  imports: [FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bitbucket-workspace.component.html',
  styleUrl: './bitbucket-workspace.component.css'
})
export class BitbucketWorkspaceComponent {
  readonly view = input.required<string>();
  readonly bb = inject(BitbucketConnectionService);
  readonly selectedKey = signal('');
  readonly selected = computed(() => this.bb.pullRequests().find(pr => this.bb.pullRequestKey(pr) === this.selectedKey()) ?? null);
  readonly reports = signal<InsightReport[]>([]);
  readonly annotations = signal<Annotation[]>([]);
  readonly commits = signal<Commit[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly coverage = computed(() => this.reports().flatMap(report => (report.data ?? [])
    .filter(metric => /coverage|cobertura/i.test(metric.title))
    .map(metric => ({ report: report.title, reporter: report.reporter, ...metric }))));
  private version = 0;

  constructor() {
    effect(() => {
      if (!this.bb.connected()) {
        this.version++;
        this.clear();
        this.selectedKey.set('');
        this.loading.set(false);
      }
    });
  }

  private clear(): void {
    this.reports.set([]); this.annotations.set([]); this.commits.set([]);
    this.error.set(''); this.loaded.set(false);
  }

  async load(): Promise<void> {
    const pr = this.selected();
    if (!pr || !this.bb.connected()) return;
    const version = ++this.version;
    this.clear(); this.loading.set(true);
    const repo = pr.toRef.repository;
    const path = `projects/${encodeURIComponent(repo.project.key)}/repos/${encodeURIComponent(repo.slug)}`;
    try {
      if (this.view() === 'historial') {
        const commits = await this.bb.readAll<Commit>(`/api/1.0/${path}/pull-requests/${pr.id}/commits`);
        if (version !== this.version) return;
        this.commits.set(commits);
      } else {
        const sha = pr.fromRef?.latestCommit;
        if (!sha) throw new Error('Bitbucket no devolvió el commit de origen de este PR. No se pueden consultar sus reportes.');
        const insightPath = `/insights/1.0/${path}/commits/${encodeURIComponent(sha)}`;
        const reports = await this.bb.readAll<InsightReport>(`${insightPath}/reports`);
        if (version !== this.version) return;
        this.reports.set(reports);
        if (this.view() === 'hallazgos') {
          const result = await this.bb.readResource<{ annotations: Annotation[] }>(`${insightPath}/annotations`);
          if (!Array.isArray(result.annotations)) throw new Error('Bitbucket devolvió anotaciones con un formato inválido.');
          if (version !== this.version) return;
          this.annotations.set(result.annotations);
        }
      }
      if (version === this.version) this.loaded.set(true);
    } catch (error) {
      if (version === this.version) this.error.set(error instanceof Error ? error.message : 'No se pudo consultar Bitbucket.');
    } finally { if (version === this.version) this.loading.set(false); }
  }

  choose(key: string): void { this.selectedKey.set(key); void this.load(); }

  exportReports(): void {
    if (!this.loaded() || !this.selected()) return;
    const payload = { pullRequest: this.selected(), reports: this.reports(), annotations: this.annotations() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'bitbucket-reportes.json'; link.click();
    URL.revokeObjectURL(url);
  }

  metricValue(value: unknown): string {
    return value === null || value === undefined ? 'Sin valor publicado' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}