import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SONAR_METRICS, SonarqubeService } from './sonarqube.service';
import { SonarqubeComponent } from './sonarqube.component';

describe('SonarQube connection and real measures', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] }));
  afterEach(() => { TestBed.inject(SonarqubeService).disconnect(); vi.unstubAllGlobals(); TestBed.resetTestingModule(); });
  const payload = { component: { key: 'biometric-local', name: 'Biometric', measures: [{metric:'coverage',value:'100.0'},{metric:'vulnerabilities',value:'0'}] } };

  it('uses Bearer and exact project/branch query through the local proxy', async () => {
    const fetch = vi.fn(async () => ({ ok:true, json:async()=>payload }));
    vi.stubGlobal('fetch',fetch);
    const sonar = TestBed.inject(SonarqubeService);
    sonar.tokenInput = 'test-only-token';
    await sonar.connect();
    const [requestUrl, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const url = new URL(requestUrl, window.location.origin);
    expect(url.pathname).toBe('/sonarqube-api/api/measures/component');
    expect(url.searchParams.get('component')).toBe('biometric-local');
    expect(url.searchParams.get('branch')).toBe('Feature-300871');
    expect(url.searchParams.get('metricKeys')).toBe(SONAR_METRICS.join(','));
    expect(options.headers).toMatchObject({Authorization:'Bearer test-only-token'});
    expect(sonar.tokenInput).toBe('');
    expect(sonar.context()?.branch).toBe('Feature-300871');
    expect(sonar.connected()).toBe(true);
  });

  it('renders actual zero vulnerabilities and does not invent missing metrics', () => {
    const fixture = TestBed.createComponent(SonarqubeComponent);
    fixture.componentRef.setInput('view','hallazgos');
    const sonar = TestBed.inject(SonarqubeService);
    sonar.result.set(payload);
    sonar.context.set({project:'biometric-local',branch:'Feature-300871',server:sonar.serverUrl});
    fixture.detectChanges();
    expect(fixture.componentInstance.metrics().find(m=>m.key==='vulnerabilities')?.value).toBe('0');
    expect(fixture.componentInstance.metrics().find(m=>m.key==='bugs')?.value).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Sin dato publicado');
    expect(fixture.nativeElement.textContent).toContain('0');
  });

  it('clears previous results when a different branch fails', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ok:true,json:async()=>payload}).mockResolvedValueOnce({ok:false,status:404});
    vi.stubGlobal('fetch',fetch);
    const sonar = TestBed.inject(SonarqubeService);
    sonar.tokenInput='test-only-token';
    await sonar.connect();
    sonar.branch='Other branch/+test';
    await sonar.refresh();
    expect(sonar.result()).toBeNull();
    expect(sonar.context()).toBeNull();
    expect(sonar.error()).toContain('404');
    expect(new URL(fetch.mock.calls[1][0],window.location.origin).searchParams.get('branch')).toBe('Other branch/+test');
  });

  it('omits branch for the main branch and clears credentials on disconnect', async () => {
    const fetch = vi.fn(async()=>({ok:true,json:async()=>payload}));
    vi.stubGlobal('fetch',fetch);
    const sonar = TestBed.inject(SonarqubeService);
    sonar.tokenInput='test-only-token'; sonar.branch='';
    await sonar.connect();
    expect(new URL(fetch.mock.calls[0][0] as unknown as string,window.location.origin).searchParams.has('branch')).toBe(false);
    sonar.disconnect();
    const count=fetch.mock.calls.length;
    await sonar.refresh();
    expect(fetch.mock.calls.length).toBe(count);
    expect(sonar.result()).toBeNull();
    expect(sonar.connected()).toBe(false);
  });

  it('rejects invalid tokens without sample results', async () => {
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:401})));
    const sonar = TestBed.inject(SonarqubeService);
    sonar.tokenInput='test-only-token';
    await sonar.connect();
    expect(sonar.connected()).toBe(false);
    expect(sonar.result()).toBeNull();
    expect(sonar.error()).toContain('401');
  });
});