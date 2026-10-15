import {provideZonelessChangeDetection} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {DecisionStore} from './decision.store';
import {DecisionWorkspaceComponent} from './decision-workspace.component';
import {WorkspacePageComponent} from '../../shared/workspace-page.component';

describe('Mock decision workspace interactions',()=>{
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideZonelessChangeDetection(),provideRouter([])]});vi.stubGlobal('fetch',vi.fn());});afterEach(()=>{vi.unstubAllGlobals();TestBed.resetTestingModule();});
 function create(view:string){const fixture=TestBed.createComponent(DecisionWorkspaceComponent);fixture.componentRef.setInput('view',view);fixture.detectChanges();return fixture;}
 it('opens the dashboard without calling services and labels the data source',()=>{
  const fixture=TestBed.createComponent(WorkspacePageComponent);for(const [key,value]of Object.entries({kind:'dashboard',title:'Dashboard',description:'Report',eyebrow:'Guardian'}))fixture.componentRef.setInput(key,value);fixture.detectChanges();expect(fixture.nativeElement.textContent).not.toMatch(/demostraci[oó]n|datos simulados/i);expect(fixture.nativeElement.querySelector('app-decision-workspace')).not.toBeNull();expect(fetch).not.toHaveBeenCalled();
 });
 it('filters the same population across indicators and developers and handles no matches',()=>{
  const fixture=create('dashboard');const store=TestBed.inject(DecisionStore);store.project.set('CAJ');store.month.set('2026-10');fixture.detectChanges();expect(store.filtered().every(pr=>pr.project==='CAJ'&&pr.date.startsWith('2026-10'))).toBe(true);expect(store.summary().total).toBe(store.filtered().length);store.query.set('no-such-pr');fixture.detectChanges();expect(store.filtered()).toEqual([]);expect(store.selected()).toBeNull();expect(fixture.nativeElement.textContent).toContain('No hay PR con estos filtros');
 });
 it('shows the selected PR report and concrete archetype differences',()=>{
  const fixture=create('pull-requests');const store=TestBed.inject(DecisionStore);const pr=store.records()[7];fixture.componentInstance.select(pr.key);fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain(pr.title);const tab=Array.from(fixture.nativeElement.querySelectorAll('button')).find((button:any)=>button.textContent.includes('Diferencias del arquetipo')) as HTMLButtonElement;tab.click();fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain(pr.archetype.differences[0].path);expect(fixture.nativeElement.textContent).toContain(pr.archetype.differences[0].actual);expect(fetch).not.toHaveBeenCalled();
 });
 it('uses chart selections as filters and preserves historical outcomes after threshold changes',()=>{
  const fixture=create('dashboard');const store=TestBed.inject(DecisionStore);fixture.componentInstance.chartPick({kind:'recommendation',value:'blocked'});expect(store.summary().blocked).toBe(store.summary().total);store.clearFilters();const approved=store.summary().approved;store.minimumCoverage.set(90);expect(store.summary().approved).toBe(approved);fixture.componentInstance.chartPick({kind:'causes',value:'archetype'});expect(store.filtered().every(pr=>pr.archetype.differences.length>0)).toBe(true);
 });
 it('filters the findings table by severity without changing the overall PR population',()=>{
  const fixture=create('dashboard');const total=fixture.componentInstance.store.summary().total;fixture.componentInstance.severity.set('critical');fixture.detectChanges();expect(fixture.componentInstance.findings().length).toBeGreaterThan(0);expect(fixture.componentInstance.findings().every(item=>item.severity==='critical')).toBe(true);expect(fixture.componentInstance.store.summary().total).toBe(total);expect(fetch).not.toHaveBeenCalled();
 });
});
