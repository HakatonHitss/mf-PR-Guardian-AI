import {provideZonelessChangeDetection} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {BitbucketConnectionService} from '../bitbucket/bitbucket-connection.service';
import {ArchetypeService} from './archetype.service';
const pkg={dependencies:{'@angular/core':'20'},scripts:{build:'ng build'}};
const targetFiles=['package.json','src/public/federation.manifest.json','src/main.ts'];
describe('Real repository snapshot orchestration',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideZonelessChangeDetection()]}));afterEach(()=>TestBed.resetTestingModule());
 function setup(policy?:object){
  const bb=TestBed.inject(BitbucketConnectionService);bb.connected.set(true);const checker=TestBed.inject(ArchetypeService);TestBed.tick();
  const read=vi.spyOn(bb,'readResource').mockImplementation(async(path)=>{
   const baseline=path.includes('/ARK/');if(path.includes('/commits?'))return {values:[{id:baseline?'base-sha':'target-sha'}]};
   if(path.includes('archetype-rules.json'))return JSON.stringify(policy);if(path.includes('/raw/package.json'))return JSON.stringify(pkg);throw new Error('Unexpected resource '+path);
  });
  vi.spyOn(bb,'readAll').mockImplementation(async(path)=>path.includes('/ARK/')?[...targetFiles,'Dockerfile',...(policy?['.guardian/archetype-rules.json']:[])]:targetFiles);
  return {bb,checker,read};
 }
 it('pins both repositories to commits and marks ungoverned differences as diagnostic',async()=>{
  const {checker,read}=setup();await checker.analyze('COB','new-shell','Desarrollo','auto','',{});
  expect(checker.assessment()?.status).toBe('Diferencias con la referencia');expect(checker.assessment()?.policyVersion).toBeNull();expect(checker.assessment()?.target.commit).toBe('target-sha');expect(checker.assessment()?.baseline.repo).toBe('sh-template');expect(read.mock.calls.some(call=>call[0].includes('until=refs%2Fheads%2FDesarrollo'))).toBe(true);expect(read.mock.calls.filter(call=>call[0].includes('/raw/')).every(call=>call[0].includes('at=')&&call[1]==='text')).toBe(true);
 });
 it('uses published policies to determine formal rule failures',async()=>{
  const {checker}=setup({version:'1.0',rules:[{id:'docker',title:'Container',category:'Deploy',kind:'file',pattern:'Dockerfile'}]});await checker.analyze('COB','new-shell','Desarrollo','shell','',{});expect(checker.assessment()?.status).toBe('Incumple reglas publicadas');expect(checker.assessment()?.policyVersion).toBe('1.0');
 });
 it('does not certify success when all declared rules are not applicable',async()=>{
  const {checker}=setup({version:'1',rules:[{id:'optional',title:'Optional file',category:'Optional',kind:'file',pattern:'any.txt',feature:'includeKafka'}]});await checker.analyze('COB','new-shell','Desarrollo','shell','',{includeKafka:false});expect(checker.assessment()?.status).toBe('Evaluación incompleta');
 });
 it('does not fall back to an apparently successful diagnosis on read failure',async()=>{
  const {checker,read}=setup();read.mockRejectedValue(new Error('HTTP 403'));await checker.analyze('COB','new-shell','Desarrollo','shell','',{});expect(checker.assessment()).toBeNull();expect(checker.error()).toContain('403');expect(checker.history()).toEqual([]);
 });
 it('does not duplicate identical snapshots in session statistics',async()=>{
  const {checker}=setup();await checker.analyze('COB','new-shell','Desarrollo','shell','',{});await checker.analyze('COB','new-shell','Desarrollo','shell','',{});expect(checker.history()).toHaveLength(1);
 });
});