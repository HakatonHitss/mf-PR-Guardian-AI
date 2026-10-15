import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BitbucketWorkspaceComponent } from './bitbucket-workspace.component';
import { BitbucketConnectionService } from './bitbucket-connection.service';

describe('Real insight data and missing data', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] }));
  afterEach(() => TestBed.resetTestingModule());
  function create(view: string) {
    const service = TestBed.inject(BitbucketConnectionService);
    service.connected.set(true);
    service.pullRequests.set([{id:17,title:'PR',state:'OPEN',fromRef:{latestCommit:'commit-sha'},toRef:{repository:{slug:'repo',project:{key:'REAL'}}}}]);
    const fixture = TestBed.createComponent(BitbucketWorkspaceComponent);
    fixture.componentRef.setInput('view', view);
    fixture.detectChanges();
    fixture.componentInstance.selectedKey.set('REAL/repo/17');
    return {fixture, service, page:fixture.componentInstance};
  }
  it('preserves a published zero coverage without inventing other metrics', async () => {
    const {fixture,service,page} = create('cobertura');
    vi.spyOn(service,'readAll').mockResolvedValue([{key:'tests',title:'Tests',data:[{title:'Line coverage',type:'PERCENTAGE',value:0}]}]);
    await page.load(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('0%');
    expect(fixture.nativeElement.textContent).not.toContain('81');
  });
  it('shows no published data rather than a fabricated successful scan', async () => {
    const {fixture,service,page} = create('hallazgos');
    vi.spyOn(service,'readAll').mockResolvedValue([]);
    vi.spyOn(service,'readResource').mockResolvedValue({annotations:[]});
    await page.load(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no tiene anotaciones');
    expect(page.annotations()).toEqual([]);
  });
  it('shows an API failure without sample fallback findings', async () => {
    const {fixture,service,page} = create('hallazgos');
    vi.spyOn(service,'readAll').mockRejectedValue(new Error('HTTP 404'));
    await page.load(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('HTTP 404');
    expect(page.loaded()).toBe(false);
    expect(page.annotations()).toEqual([]);
  });
  it('loads commit history from the selected PR', async () => {
    const {fixture,service,page} = create('historial');
    const read = vi.spyOn(service,'readAll').mockResolvedValue([{id:'abc',displayId:'abc',message:'Real commit',author:{name:'Real author'}}]);
    await page.load(); fixture.detectChanges();
    expect(read).toHaveBeenCalledWith('/api/1.0/projects/REAL/repos/repo/pull-requests/17/commits');
    expect(fixture.nativeElement.textContent).toContain('Real commit');
  });
});