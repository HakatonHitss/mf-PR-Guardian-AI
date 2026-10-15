import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HuaweiAiComponent } from '../huawei-ai/huawei-ai.component';
import { SonarqubeComponent } from '../sonarqube/sonarqube.component';
import { BitbucketWorkspaceComponent } from './bitbucket-workspace.component';
import { BitbucketConnectionService } from './bitbucket-connection.service';

@Component({
  selector: 'app-bitbucket',
  imports: [FormsModule, RouterLink, BitbucketWorkspaceComponent, SonarqubeComponent, HuaweiAiComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bitbucket.component.html',
  styleUrl: './bitbucket.component.css',
  host: { class: 'block min-w-0' }
})
export class BitbucketComponent {
  readonly bb = inject(BitbucketConnectionService);
  readonly titles: Partial<Record<string, string>> = { dashboard: 'Dashboard general', 'pull-requests': 'Mis pull requests abiertos', projects: 'Proyectos y repositorios', hallazgos: 'Hallazgos y vulnerabilidades', cobertura: 'Cobertura de pruebas', historial: 'Historial de commits', reportes: 'Reportes y exportaciones', configuracion: 'Configuración', asistente: 'Asistente de IA' };
  readonly projectQuery = signal('');
  readonly repoQuery = signal('');
  readonly prQuery = signal('');
  readonly filteredProjects = computed(() => this.bb.projects().filter(item => this.matches(this.projectQuery(), `${item.key} ${item.name} ${item.description ?? ''}`)));
  readonly filteredRepos = computed(() => this.bb.repositories().filter(item => this.matches(this.repoQuery(), `${item.slug} ${item.name} ${item.description ?? ''}`)));
  readonly filteredPrs = computed(() => this.bb.pullRequests().filter(pr => this.matches(this.prQuery(), `${pr.id} ${pr.title} ${pr.state} ${pr.toRef.repository.slug} ${pr.toRef.repository.project.key}`)));
  private matches(query: string, text: string): boolean {
    const normalize = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
    return normalize(text).includes(normalize(query).trim());
  }  readonly pageView = input<string>();
  private readonly route = inject(ActivatedRoute);
  get view(): string | undefined { return this.pageView() ?? this.route.snapshot.data['bitbucketView'] as string | undefined; }
}