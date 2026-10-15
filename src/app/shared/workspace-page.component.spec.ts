import {provideZonelessChangeDetection} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {WorkspacePageComponent} from './workspace-page.component';
import {ArchetypesComponent} from '../features/archetypes/archetypes.component';
import {DecisionStore} from '../features/decisions/decision.store';
import {ReviewToolsComponent} from '../features/decisions/review-tools.component';
describe('Local review workspace',()=>{
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideZonelessChangeDetection(),provideRouter([])]});vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('External services are disabled');}));});
 afterEach(()=>{vi.unstubAllGlobals();TestBed.resetTestingModule();});
 function create(kind:string){const fixture=TestBed.createComponent(WorkspacePageComponent);for(const [key,value]of Object.entries({kind,title:'Workspace',description:'Quality',eyebrow:'Guardian'}))fixture.componentRef.setInput(key,value);fixture.detectChanges();return fixture;}
 it('renders every business page without connection forms or external requests',()=>{
  for(const view of ['dashboard','pull-requests','hallazgos','cobertura','historial','proyectos','reportes','configuracion','asistente']){const fixture=create(view);expect(fixture.nativeElement.querySelector('app-bitbucket')).toBeNull();expect(fixture.nativeElement.querySelector('app-huawei-ai')).toBeNull();expect(fixture.nativeElement.textContent).not.toMatch(/demostración|datos simulados|conectar bitbucket/i);fixture.destroy();}const archetypes=TestBed.createComponent(ArchetypesComponent);archetypes.detectChanges();expect(archetypes.nativeElement.textContent).toContain('Diferencias de arquetipo');expect(fetch).not.toHaveBeenCalled();
 });
 it('applies the same coverage threshold to all recommendations without rewriting history',()=>{
  const fixture=TestBed.createComponent(ReviewToolsComponent);fixture.componentRef.setInput('view','configuracion');fixture.detectChanges();const store=TestBed.inject(DecisionStore);const history=store.records().map(pr=>pr.outcome);fixture.componentInstance.apply('90');fixture.detectChanges();expect(store.minimumCoverage()).toBe(90);expect(store.records().map(pr=>pr.outcome)).toEqual(history);expect(fixture.nativeElement.textContent).toContain('Criterio aplicado');expect(fetch).not.toHaveBeenCalled();
 });
 it('answers from the selected PR evidence including actual paths and corrections',()=>{
  const fixture=TestBed.createComponent(ReviewToolsComponent);const store=TestBed.inject(DecisionStore);const pr=store.records()[7];fixture.componentInstance.select(pr.key);fixture.componentInstance.ask('arquetipo');fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain(pr.archetype.differences[0].path);expect(fixture.nativeElement.textContent).toContain(pr.archetype.differences[0].fix);expect(fetch).not.toHaveBeenCalled();
 });
 it('selects a predefined PR and resets conflicting filters for its report',()=>{
  const fixture=create('pull-requests');const store=TestBed.inject(DecisionStore);
  const pr=store.records()[7];store.project.set('no-match');fixture.detectChanges();
  const selector=fixture.nativeElement.querySelector('#decision-pr-filter') as HTMLSelectElement;
  expect(selector.options.length).toBe(store.records().length+1);
  expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
  selector.value=pr.key;selector.dispatchEvent(new Event('change'));fixture.detectChanges();
  expect(store.filtered().map(item=>item.key)).toEqual([pr.key]);expect(store.selected()?.key).toBe(pr.key);
  selector.value='';selector.dispatchEvent(new Event('change'));fixture.detectChanges();
  expect(store.filtered()).toHaveLength(store.records().length);expect(fetch).not.toHaveBeenCalled();
 });
});
