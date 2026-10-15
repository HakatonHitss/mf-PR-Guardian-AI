import { Injectable, signal } from '@angular/core';

interface Project { id: number; key: string; name: string; description?: string; }
interface Repository { id: number; slug: string; name: string; description?: string; }
interface Page<T> { values: T[]; isLastPage: boolean; nextPageStart?: number; }

export interface PullRequest {
  id: number;
  title: string;
  state: string;
  fromRef?: { latestCommit: string };
  toRef: { latestCommit?:string; repository: { slug: string; project: { key: string } } };
  links?: { self?: { href: string }[] };
}
export interface InsightReport {
  key: string; title: string; reporter?: string; result?: string; details?: string;
  data?: { title: string; type?: string; value: unknown }[];
}
export interface Annotation { reportKey?: string; path?: string; line?: number; severity?: string; type?: string; message: string; }
export interface Commit { id: string; displayId: string; message: string; author?: { name: string }; authorTimestamp?: number; }
@Injectable({ providedIn: 'root' })
export class BitbucketConnectionService {
  serverUrl = 'http://172.19.113.113';
  tokenInput = '';
  readonly connected = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly pullRequests = signal<PullRequest[]>([]);
  readonly nextPullRequests = signal<number | null>(null);
  readonly pullRequestsLoaded = signal(false);
  readonly pullRequestsError = signal('');
  readonly projects = signal<Project[]>([]);
  readonly repositories = signal<Repository[]>([]);
  readonly selectedProject = signal<Project | null>(null);
  readonly nextProjects = signal<number | null>(null);
  readonly nextRepositories = signal<number | null>(null);
  readonly repositoriesLoaded = signal(false);
  private token = '';
  private baseUrl = '';
  private readonly resourceRequests = new Set<AbortController>();
  private request: AbortController | null = null;

  async connect(): Promise<void> {
    if (this.busy()) return;
    const enteredToken = this.tokenInput.trim();
    this.disconnect();
    try {
      const url = new URL(this.serverUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error('Ingresa una URL HTTP o HTTPS sin credenciales, parámetros ni fragmentos.');
      }
      if (window.location.protocol === 'https:' && url.protocol === 'http:' && !this.usesLocalProxy(url.href.replace(/\/+$/, ''))) {
        throw new Error('Esta página usa HTTPS. Necesitas una URL HTTPS de Bitbucket o abrir el frontend por HTTP para conectar.');
      }
      if (!enteredToken) throw new Error('Ingresa el token de acceso de Bitbucket.');
      this.baseUrl = url.href.replace(/\/+$/, '');
      this.token = enteredToken;
      this.tokenInput = '';
      this.busy.set(true);
      const page = await this.getPage<Project>('projects', 0);
      this.projects.set(page.values);
      this.nextProjects.set(this.nextStart(page));
      this.connected.set(true);
      await this.fetchPullRequests(0);
    } catch (error) {
      this.token = '';
      this.error.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  async loadProjects(): Promise<void> {
    const start = this.nextProjects();
    if (this.busy() || start === null) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const page = await this.getPage<Project>('projects', start);
      this.projects.update(items => [...items, ...page.values]);
      this.nextProjects.set(this.nextStart(page, start));
    } catch (error) { this.error.set(this.message(error)); }
    finally { this.busy.set(false); }
  }

  async selectProject(project: Project): Promise<void> {
    if (this.busy()) return;
    this.selectedProject.set(project);
    this.repositories.set([]);
    this.nextRepositories.set(null);
    this.repositoriesLoaded.set(false);
    await this.loadRepositories(0);
  }

  async loadRepositories(start = this.nextRepositories() ?? 0): Promise<void> {
    const project = this.selectedProject();
    if (!project || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const page = await this.getPage<Repository>(`projects/${encodeURIComponent(project.key)}/repos`, start);
      this.repositories.update(items => start === 0 ? page.values : [...items, ...page.values]);
      this.nextRepositories.set(this.nextStart(page, start));
      this.repositoriesLoaded.set(true);
    } catch (error) { this.error.set(this.message(error)); }
    finally { this.busy.set(false); }
  }

  disconnect(): void {
    this.request?.abort();
    for (const request of this.resourceRequests) request.abort();
    this.resourceRequests.clear();
    this.token = '';
    this.baseUrl = '';
    this.tokenInput = '';
    this.connected.set(false);
    this.pullRequests.set([]);
    this.nextPullRequests.set(null);
    this.pullRequestsLoaded.set(false);
    this.pullRequestsError.set('');
    this.projects.set([]);
    this.repositories.set([]);
    this.selectedProject.set(null);
    this.nextProjects.set(null);
    this.nextRepositories.set(null);
    this.repositoriesLoaded.set(false);
    this.error.set('');
  }



  async loadPullRequests(start = this.nextPullRequests() ?? 0): Promise<void> {
    if (!this.connected() || this.busy()) return;
    this.busy.set(true);
    try { await this.fetchPullRequests(start); }
    finally { this.busy.set(false); }
  }

  private async fetchPullRequests(start: number): Promise<void> {
    this.pullRequestsError.set('');
    try {
      const page = await this.getPage<PullRequest>('dashboard/pull-requests', start, 100, '&state=OPEN&role=AUTHOR');
      const next = this.nextStart(page, start);
      this.pullRequests.update(items => start === 0 ? page.values : [...items, ...page.values]);
      this.nextPullRequests.set(next);
      this.pullRequestsLoaded.set(true);
    } catch (error) { this.pullRequestsError.set(this.message(error)); }
  }

  pullRequestKey(pr: PullRequest): string {
    return `${pr.toRef.repository.project.key}/${pr.toRef.repository.slug}/${pr.id}`;
  }

  pullRequestUrl(pr: PullRequest): string {
    const href = pr.links?.self?.[0]?.href;
    if (href) {
      try {
        const candidate = new URL(href, `${this.baseUrl}/`);
        if (['http:', 'https:'].includes(candidate.protocol) && candidate.origin === new URL(this.baseUrl).origin && !candidate.username && !candidate.password) return candidate.href;
      } catch { /* Use the repository path when the supplied link is invalid. */ }
    }
    const repo = pr.toRef.repository;
    return `${this.baseUrl}/projects/${encodeURIComponent(repo.project.key)}/repos/${encodeURIComponent(repo.slug)}/pull-requests/${encodeURIComponent(pr.id)}`;
  }
  private usesLocalProxy(baseUrl = this.baseUrl): boolean {
    return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && baseUrl === 'http://172.19.113.113';
  }

  private apiUrl(resource: string): string {
    return `${this.usesLocalProxy() ? '/bitbucket-api' : this.baseUrl}/rest${resource}`;
  }
  async readResource<T>(resource: string, responseType: 'json' | 'text' = 'json'): Promise<T> {
    if (!this.connected()) throw new Error('Conecta Bitbucket antes de consultar datos.');
    if (!/^\/(?:api|insights|build-status)\/1\.0\//.test(resource)) throw new Error('Ruta de consulta inválida.');
    const controller = new AbortController();
    this.resourceRequests.add(controller);
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(this.apiUrl(resource), {
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
        signal: controller.signal, credentials: 'omit', redirect: 'error', cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Bitbucket respondió HTTP ${response.status}. ${response.status === 404 ? 'El recurso o Code Insights no está disponible en este servidor.' : response.status === 401 || response.status === 403 ? 'Revisa el token y sus permisos.' : 'Reintenta la consulta.'}`);
      return (responseType === 'text' ? await response.text() : await response.json()) as T;
    } finally {
      window.clearTimeout(timeout);
      this.resourceRequests.delete(controller);
    }
  }

  async readAll<T>(resource: string): Promise<T[]> {
    const values: T[] = [];
    let start = 0;
    do {
      const page = await this.readResource<Page<T>>(`${resource}${resource.includes('?') ? '&' : '?'}limit=100&start=${start}`);
      if (!Array.isArray(page.values) || typeof page.isLastPage !== 'boolean') throw new Error('Bitbucket devolvió una lista inválida.');
      values.push(...page.values);
      const next = this.nextStart(page, start);
      if (next === null) return values;
      start = next;
    } while (this.connected());
    throw new Error('La conexión se cerró durante la consulta.');
  }
  private nextStart<T>(page: Page<T>, start = 0): number | null {
    if (page.isLastPage) return null;
    if (!Number.isInteger(page.nextPageStart) || (page.nextPageStart ?? 0) <= start) {
      throw new Error('Bitbucket devolvió una paginación inválida.');
    }
    return page.nextPageStart ?? null;
  }

  private async getPage<T>(path: string, start: number, limit = 25, filters = ''): Promise<Page<T>> {
    const controller = new AbortController();
    this.request = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(this.apiUrl(`/api/1.0/${path}?limit=${limit}&start=${start}${filters}`), {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store'
      });
      if (!response.ok) {
        const messages: Record<number, string> = {
          401: 'Token inválido o vencido. Desconecta e ingresa un token vigente.',
          403: 'El token no tiene permiso para consultar este recurso.',
          404: 'No se encontró el recurso. Revisa la URL y la ruta de Bitbucket.'
        };
        throw new Error(messages[response.status] ?? `Bitbucket respondió con HTTP ${response.status}. Intenta nuevamente.`);
      }
      const page = await response.json() as Page<T>;
      if (!Array.isArray(page.values) || typeof page.isLastPage !== 'boolean') {
        throw new Error('La respuesta no tiene el formato esperado de Bitbucket Server.');
      }
      return page;
    } finally {
      window.clearTimeout(timeout);
      if (this.request === controller) this.request = null;
    }
  }

  private message(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') return 'La consulta se canceló o superó los 20 segundos. Revisa la conexión a la red interna.';
    if (error instanceof TypeError) return 'El navegador no pudo acceder a Bitbucket. Revisa la URL, la red o VPN y la consola del navegador: puede ser un bloqueo de CORS o de acceso a la red local.';
    return error instanceof Error ? error.message : 'No se pudo completar la consulta.';
  }
}