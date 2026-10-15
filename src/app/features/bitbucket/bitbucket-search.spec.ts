import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BitbucketComponent } from './bitbucket.component';
import { BitbucketConnectionService } from './bitbucket-connection.service';

describe('Search and focused screens', () => {
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideZonelessChangeDetection(),provideRouter([])]}));
  afterEach(()=>TestBed.resetTestingModule());
  function create(view:string) {const fixture=TestBed.createComponent(BitbucketComponent);fixture.componentRef.setInput('pageView',view);TestBed.inject(BitbucketConnectionService).connected.set(true);fixture.detectChanges();return fixture;}
  it('searches projects without accents or case sensitivity',()=>{
    const fixture=create('projects');const service=TestBed.inject(BitbucketConnectionService);
    service.projects.set([{id:1,key:'COB',name:'Gestión de Cobranza'},{id:2,key:'API',name:'Interfaces'}]);
    fixture.componentInstance.projectQuery.set('gestion');fixture.detectChanges();
    expect(fixture.componentInstance.filteredProjects()).toHaveLength(1);expect(fixture.nativeElement.textContent).toContain('Gestión de Cobranza');expect(fixture.nativeElement.textContent).not.toContain('Interfaces');
    fixture.componentInstance.projectQuery.set('not-found');fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('No hay coincidencias');
  });
  it('searches PR by ID, title, repository and project',()=>{
    const fixture=create('pull-requests');const service=TestBed.inject(BitbucketConnectionService);
    service.pullRequests.set([{id:17,title:'Validación biométrica',state:'OPEN',toRef:{repository:{slug:'biometric-local',project:{key:'COB'}}}},{id:29,title:'Payments',state:'OPEN',toRef:{repository:{slug:'payments',project:{key:'PAY'}}}}]);
    for(const query of ['17','validacion','BIOMETRIC','COB']){fixture.componentInstance.prQuery.set(query);expect(fixture.componentInstance.filteredPrs()).toHaveLength(1);}
  });
  it('shows connection forms only in configuration',()=>{
    const fixture=create('pull-requests');expect(fixture.nativeElement.querySelector('#bitbucket-token')).toBeNull();expect(fixture.nativeElement.querySelector('#bitbucket-url')).toBeNull();
    fixture.componentRef.setInput('pageView','configuracion');fixture.detectChanges();expect(fixture.nativeElement.querySelector('#bitbucket-url')).not.toBeNull();expect(fixture.nativeElement.querySelector('#sonar-url')).not.toBeNull();
  });
});