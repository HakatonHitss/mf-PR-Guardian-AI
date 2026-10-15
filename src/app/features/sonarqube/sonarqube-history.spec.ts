import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SonarqubeService } from './sonarqube.service';
import { SonarqubeComponent } from './sonarqube.component';
import { provideRouter } from '@angular/router';

describe('Published analysis history and charts', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers:[provideZonelessChangeDetection(),provideRouter([])] }));
  afterEach(() => { TestBed.inject(SonarqubeService).disconnect(); vi.unstubAllGlobals(); TestBed.resetTestingModule(); });
  const current = {component:{key:'biometric-local',measures:[{metric:'coverage',value:'100.0'},{metric:'vulnerabilities',value:'0'}]}};
  async function connect(fetch: ReturnType<typeof vi.fn>) {
    vi.stubGlobal('fetch',fetch); const service=TestBed.inject(SonarqubeService);service.tokenInput='test-only-token';await service.connect();return service;
  }
  it('uses real paginated history and keeps zero while excluding missing values', async () => {
    const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>current})
      .mockResolvedValueOnce({ok:true,json:async()=>({paging:{pageIndex:1,pageSize:2,total:3},measures:[{metric:'coverage',history:[{date:'2026-10-01T00:00:00Z',value:'0'},{date:'2026-10-02T00:00:00Z'}]}]})})
      .mockResolvedValueOnce({ok:true,json:async()=>({paging:{pageIndex:2,pageSize:2,total:3},measures:[{metric:'coverage',history:[{date:'2026-10-05T00:00:00Z',value:'100.0'}]}]})});
    const service=await connect(fetch); await service.loadHistory('coverage',90);
    expect(service.history().map(p=>p.value)).toEqual([0,100]);
    const url=new URL(fetch.mock.calls[2][0],window.location.origin);
    expect(url.pathname).toBe('/sonarqube-api/api/measures/search_history');
    expect(url.searchParams.get('metrics')).toBe('coverage');expect(url.searchParams.get('branch')).toBe('Feature-300871');expect(url.searchParams.get('p')).toBe('2');
  });
  it('keeps current metrics when historical API fails and invents no points', async () => {
    const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>current}).mockResolvedValueOnce({ok:false,status:403});
    const service=await connect(fetch);await service.loadHistory('coverage',30);
    expect(service.result()).toEqual(current);expect(service.history()).toEqual([]);expect(service.historyError()).toContain('403');
  });
  it('clears historical data when switching branch', async () => {
    const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>current});const service=await connect(fetch);
    service.history.set([{date:'2026-10-01',value:20}]);service.historyContext.set({metric:'coverage',days:90});
    service.branch='Other';await service.refresh();expect(service.history()).toEqual([]);expect(service.historyContext()).toBeNull();
  });
  it('places analysis points by time rather than evenly spacing dates', () => {
    const fixture=TestBed.createComponent(SonarqubeComponent);fixture.componentRef.setInput('view','cobertura');
    const service=TestBed.inject(SonarqubeService);service.historyContext.set({metric:'coverage',days:90});
    service.history.set([{date:'2026-10-01',value:0},{date:'2026-10-02',value:50},{date:'2026-10-11',value:100}]);
    const points=fixture.componentInstance.points();expect(points[1].x).toBeCloseTo(106);expect(points[0].y).toBe(200);expect(points[2].y).toBe(40);
  });
  it('shows a single analysis as a point without a fabricated trend line', () => {
    const fixture=TestBed.createComponent(SonarqubeComponent);fixture.componentRef.setInput('view','cobertura');
    const service=TestBed.inject(SonarqubeService);service.connected.set(true);service.result.set(current);service.context.set({project:'biometric-local',branch:'Feature-300871',server:service.serverUrl});
    service.historyContext.set({metric:'coverage',days:90});service.history.set([{date:'2026-10-01',value:100}]);fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('circle').length).toBe(1);expect(fixture.nativeElement.querySelector('polyline')).toBeNull();expect(fixture.nativeElement.textContent).toContain('un solo análisis');
  });
});