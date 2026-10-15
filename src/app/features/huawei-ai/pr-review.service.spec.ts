import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { BitbucketConnectionService } from '../bitbucket/bitbucket-connection.service';
import { DiffResponse,formatPrDiff,PrReviewService,PrSnapshot } from './pr-review.service';
import { HuaweiAiService } from './huawei-ai.service';

const pr:PrSnapshot={id:17,title:'Update form',state:'OPEN',version:2,fromRef:{latestCommit:'source-sha'},toRef:{latestCommit:'target-sha',repository:{slug:'frontend',project:{key:'WEB'}}}};
const diff:DiffResponse={diffs:[{source:{toString:'src/old.ts'},destination:{toString:'src/new.ts'},hunks:[{sourceLine:1,sourceSpan:2,destinationLine:1,destinationSpan:2,segments:[{type:'REMOVED',lines:[{line:'const value = 1;'}]},{type:'ADDED',lines:[{line:'const value = 2;'}]}]}]}]};

describe('Pull request review data',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideZonelessChangeDetection()]}));
 afterEach(()=>{vi.unstubAllGlobals();TestBed.resetTestingModule();});
 function setup(){const bb=TestBed.inject(BitbucketConnectionService);bb.connected.set(true);bb.pullRequests.set([pr]);const review=TestBed.inject(PrReviewService);TestBed.tick();review.select('WEB/frontend/17');return {bb,review};}
 function mockData(bb:BitbucketConnectionService,final:PrSnapshot=pr){
  const resource=vi.spyOn(bb,'readResource').mockImplementation(async(path)=>path.includes('/diff?')?diff:resource.mock.calls.filter(call=>!call[0].includes('/diff?')).length>1?final:pr);
  const all=vi.spyOn(bb,'readAll').mockImplementation(async(path)=>path.endsWith('/changes')?[{type:'MOVE',path:{toString:'src/new.ts'},srcPath:{toString:'src/old.ts'}}]:[{id:'old',displayId:'old',message:'Older',author:{name:'A'},authorTimestamp:100},{id:'new',displayId:'new',message:'Latest',author:{displayName:'B',name:'b'},committerTimestamp:200}]);
  return {resource,all};
 }
 it('formats added and removed lines with real newlines and paths',()=>{
  const result=formatPrDiff(diff);expect(result.text).toContain('--- src/old.ts\n+++ src/new.ts');expect(result.text).toContain('-const value = 1;\n+const value = 2;');expect(result.serverTruncated).toBe(false);
 });
 it('loads changes, commits and diff from the selected repository PR and sorts latest first',async()=>{
  const {bb,review}=setup();const {all,resource}=mockData(bb);await review.load();
  expect(all).toHaveBeenCalledWith('/api/1.0/projects/WEB/repos/frontend/pull-requests/17/changes');expect(all).toHaveBeenCalledWith('/api/1.0/projects/WEB/repos/frontend/pull-requests/17/commits');expect(resource).toHaveBeenCalledWith('/api/1.0/projects/WEB/repos/frontend/pull-requests/17/diff?contextLines=3&withComments=false');
  expect(review.review()?.files[0]).toEqual({path:'src/new.ts',oldPath:'src/old.ts',type:'MOVE'});expect(review.review()?.commits[0].id).toBe('new');expect(review.review()?.commits[0].author).toBe('B');
 });
 it('rejects mixed snapshots if the PR changes during loading',async()=>{
  const {bb,review}=setup();mockData(bb,{...pr,version:3,fromRef:{latestCommit:'new-source'}});await review.load();expect(review.review()).toBeNull();expect(review.error()).toContain('cambió');
 });
 it('marks nested server truncation and bounds the diff sent to the model',async()=>{
  const {bb,review}=setup();mockData(bb);await review.load();const data=review.review()!;
  const partial=formatPrDiff({diffs:[{hunks:[{sourceLine:1,sourceSpan:1,destinationLine:1,destinationSpan:1,segments:[{type:'ADDED',truncated:'true',lines:[{line:'x'.repeat(70000)}]}]}]}]});
  expect(partial.serverTruncated).toBe(true);expect(partial.previewTruncated).toBe(true);expect(partial.text.length).toBeLessThanOrEqual(60000);
  review.review.set({...data,diff:'x'.repeat(25000)});const context=review.context() as {diff:string;diffTruncated:boolean};expect(context.diff.length).toBe(20000);expect(context.diffTruncated).toBe(true);
 });
 it('does not reuse another selection or disconnected account data',async()=>{
  const {bb,review}=setup();mockData(bb);await review.load();expect(review.context()).not.toBeNull();review.select('WEB/frontend/29');expect(review.context()).toBeNull();expect(review.review()).toBeNull();bb.connected.set(false);TestBed.tick();expect(review.context()).toBeNull();
 });
 it('shares selected PR evidence with Huawei only when explicitly requested',async()=>{
  const {bb,review}=setup();mockData(bb);await review.load();
  const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({data:[{id:'glm-5.2'}]})}).mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:'Review of supplied diff'}}]})});vi.stubGlobal('fetch',fetch);
  const ai=TestBed.inject(HuaweiAiService);ai.keyInput='test-only-key';await ai.connect();await ai.ask('Review', '',false,false);
  let payload=JSON.parse(fetch.mock.calls[1][1].body);expect(payload.messages.at(-1).content).not.toContain('pullRequest');
  ai.clearConversation();await ai.ask('Review', '',false,true);payload=JSON.parse(fetch.mock.calls[2][1].body);const content=JSON.parse(payload.messages.at(-1).content);expect(content.pullRequest.sourceCommit).toBe('source-sha');expect(content.pullRequest.diff).toContain('+const value = 2;');expect(fetch.mock.calls[2][1].body).not.toContain('test-only-key');
 });
});