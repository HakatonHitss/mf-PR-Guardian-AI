import { Injectable, computed, signal } from '@angular/core';

export interface HistoryPoint { date: string; value: number; }
export interface SonarMeasure { metric: string; value?: string; }
export interface SonarResult { component: { key: string; name?: string; measures: SonarMeasure[] }; }
export const SONAR_METRICS = ['alert_status', 'bugs', 'vulnerabilities', 'security_hotspots', 'code_smells', 'coverage', 'duplicated_lines_density', 'ncloc'] as const;

@Injectable({ providedIn: 'root' })
export class SonarqubeService {
  serverUrl = 'http://172.19.245.21:9000/sonarqube';
  projectKey = 'biometric-local';
  branch = 'Feature-300871';
  tokenInput = '';
  readonly connected = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly result = signal<SonarResult | null>(null);
  readonly context = signal<{ project: string; branch: string; server: string } | null>(null);
  readonly measures = computed(() => this.result()?.component.measures ?? []);
  readonly history = signal<HistoryPoint[]>([]);
  readonly historyBusy = signal(false);
  readonly historyError = signal('');
  readonly historyContext = signal<{ metric: string; days: number } | null>(null);
  private historyRequest: AbortController | null = null;
  private token = '';
  private baseUrl = '';
  private request: AbortController | null = null;
  private generation = 0;

  async connect(): Promise<void> {
    if (this.busy()) return;
    const enteredToken = this.tokenInput.trim();
    this.disconnect();
    try {
      const url = new URL(this.serverUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Ingresa una URL HTTP o HTTPS válida de SonarQube, sin credenciales ni parámetros.');
      this.baseUrl = url.href.replace(/\/+$/, '');
      if (window.location.protocol === 'https:' && url.protocol === 'http:' && !this.localProxy()) throw new Error('Necesitas SonarQube por HTTPS para conectar desde esta página.');
      if (!enteredToken) throw new Error('Ingresa el token de SonarQube.');
      this.token = enteredToken;
      await this.refresh();
      if (!this.result()) this.token = '';
    } catch (error) {
      this.token = '';
      this.error.set(error instanceof Error ? error.message : 'No se pudo conectar a SonarQube.');
    }
  }

  async refresh(): Promise<void> {
    if (this.busy() || !this.token) return;
    const project = this.projectKey.trim();
    const branch = this.branch.trim();
    this.clearHistory();
    this.result.set(null); this.context.set(null); this.error.set('');
    if (!project) { this.error.set('Ingresa la clave del proyecto en SonarQube.'); return; }
    const generation = ++this.generation;
    const controller = new AbortController();
    this.request = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    this.busy.set(true);
    try {
      const params = new URLSearchParams({ component: project, metricKeys: SONAR_METRICS.join(',') });
      if (branch) params.set('branch', branch);
      const base = this.localProxy() ? '/sonarqube-api' : this.baseUrl;
      const response = await fetch(`${base}/api/measures/component?${params}`, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
        credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal
      });
      if (!response.ok) {
        if (response.status === 401) { this.token = ''; this.connected.set(false); }
        const descriptions: Record<number, string> = {
          400: 'Revisa la clave del proyecto, el nombre exacto de la rama y las métricas disponibles en esta versión.',
          401: 'El token de SonarQube es inválido o venció. Vuelve a conectarte.',
          403: 'El token no tiene permiso para consultar este proyecto.',
          404: 'No se encontró el proyecto, la rama o la API de SonarQube.'
        };
        throw new Error(`HTTP ${response.status}. ${descriptions[response.status] ?? 'No se pudo consultar SonarQube.'}`);
      }
      const result = await response.json() as SonarResult;
      if (!result.component || typeof result.component.key !== 'string' || !Array.isArray(result.component.measures) || result.component.measures.some(m => !m || typeof m.metric !== 'string' || (m.value !== undefined && typeof m.value !== 'string'))) throw new Error('SonarQube devolvió un formato de métricas inválido.');
      if (generation !== this.generation) return;
      this.result.set(result);
      this.context.set({ project: result.component.key, branch, server: this.baseUrl });
      this.connected.set(true);
    } catch (error) {
      if (generation !== this.generation) return;
      this.error.set(error instanceof DOMException && error.name === 'AbortError' ? 'La consulta a SonarQube superó los 20 segundos o fue cancelada.' : error instanceof TypeError ? 'No se pudo acceder a SonarQube. Revisa la red, el proxy local y CORS.' : error instanceof Error ? error.message : 'No se pudo consultar SonarQube.');
    } finally {
      window.clearTimeout(timeout);
      if (generation === this.generation) { this.busy.set(false); this.request = null; }
    }
  }

  disconnect(): void {
    this.generation++;
    this.clearHistory();
    this.request?.abort(); this.request = null;
    this.token = ''; this.tokenInput = ''; this.baseUrl = '';
    this.connected.set(false); this.busy.set(false); this.error.set('');
    this.result.set(null); this.context.set(null);
  }

  private clearHistory(): void {
    this.historyRequest?.abort(); this.historyRequest = null;
    this.history.set([]); this.historyContext.set(null); this.historyBusy.set(false); this.historyError.set('');
  }

  async loadHistory(metric: string, days: number): Promise<void> {
    const context = this.context();
    if (!context || !this.token || !SONAR_METRICS.includes(metric as typeof SONAR_METRICS[number]) || metric === 'alert_status' || ![30,90,365].includes(days)) return;
    this.clearHistory();
    const generation = this.generation;
    const controller = new AbortController(); this.historyRequest = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    this.historyBusy.set(true);
    try {
      const points = new Map<string, HistoryPoint>();
      const from = new Date(Date.now() - days * 86400000).toISOString().slice(0,10);
      let page = 1;
      while (true) {
        const params = new URLSearchParams({ component: context.project, metrics: metric, from, p: String(page), ps:'1000' });
        if (context.branch) params.set('branch',context.branch);
        const response = await fetch(`${this.localProxy() ? '/sonarqube-api' : this.baseUrl}/api/measures/search_history?${params}`, {
          headers:{Authorization:`Bearer ${this.token}`,Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal
        });
        if (!response.ok) throw new Error(`Historial no disponible: HTTP ${response.status}. Las métricas actuales se conservan.`);
        const result = await response.json() as { paging: { pageIndex:number; pageSize:number; total:number }; measures: { metric:string; history:{date:string;value?:string}[] }[] };
        if (!Array.isArray(result.measures) || !result.paging || result.paging.pageIndex !== page || !Number.isInteger(result.paging.pageSize) || result.paging.pageSize < 1 || !Number.isInteger(result.paging.total) || result.paging.total < 0) throw new Error('SonarQube devolvió un historial con formato inválido.');
        const series = result.measures.find(series => series.metric === metric);
        if (series && !Array.isArray(series.history)) throw new Error('SonarQube devolvió una serie inválida.');
        for (const point of series?.history ?? []) {
          if (typeof point.value !== 'string' || !point.value.trim() || !Number.isFinite(Number(point.value)) || !Number.isFinite(Date.parse(point.date))) continue;
          points.set(point.date,{date:point.date,value:Number(point.value)});
        }
        if (page * result.paging.pageSize >= result.paging.total) break;
        page++;
      }
      if (generation !== this.generation || this.historyRequest !== controller) return;
      this.history.set([...points.values()].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)));
      this.historyContext.set({metric,days});
    } catch (error) {
      if (generation === this.generation && this.historyRequest === controller) this.historyError.set(error instanceof DOMException && error.name === 'AbortError' ? 'La consulta histórica superó los 20 segundos.' : error instanceof Error ? error.message : 'No se pudo consultar el historial.');
    } finally {
      window.clearTimeout(timeout);
      if (this.historyRequest === controller) { this.historyBusy.set(false); this.historyRequest = null; }
    }
  }
  private localProxy(): boolean {
    return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && this.baseUrl === 'http://172.19.245.21:9000/sonarqube';
  }
}