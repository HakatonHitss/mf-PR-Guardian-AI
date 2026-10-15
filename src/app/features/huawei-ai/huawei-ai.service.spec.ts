import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { HuaweiAiService } from './huawei-ai.service';
import { BitbucketConnectionService } from '../bitbucket/bitbucket-connection.service';
import { SonarqubeService } from '../sonarqube/sonarqube.service';

describe('Huawei MaaS assistant',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideZonelessChangeDetection()]}));
 afterEach(()=>{TestBed.inject(HuaweiAiService).disconnect();vi.unstubAllGlobals();TestBed.resetTestingModule();});
 async function connect(response?:object){
  const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({data:[{id:'glm-5.2'},{id:'deepseek-v4-flash'}]})}).mockResolvedValue(response??{ok:true,json:async()=>({model:'glm-5.2',choices:[{message:{content:'Real model answer'}}]})});
  vi.stubGlobal('fetch',fetch);const ai=TestBed.inject(HuaweiAiService);ai.keyInput='test-only-maas-key';await ai.connect();return {ai,fetch};
 }
 it('loads the catalog, clears the key input and waits for inference to claim verification',async()=>{
  const {ai,fetch}=await connect();expect(fetch.mock.calls[0][0]).toBe('/huawei-maas-api/models');expect(ai.keyInput).toBe('');expect(ai.connected()).toBe(true);expect(ai.verified()).toBe(false);expect(ai.model).toBe('glm-5.2');
 });
 it('sends real chat requests without workspace context unless selected',async()=>{
  const {ai,fetch}=await connect();await ai.ask('Review this','const value = 1;',false);
  const options=fetch.mock.calls[1][1];const body=JSON.parse(options.body);expect(fetch.mock.calls[1][0]).toBe('/huawei-maas-api/chat/completions');expect(body.model).toBe('glm-5.2');expect(body.stream).toBe(false);expect(body.messages[1].content).toContain('const value = 1;');expect(body.messages[1].content).not.toContain('workspaceData');expect(options.headers.Authorization).toBe('Bearer test-only-maas-key');expect(ai.messages()[1].content).toBe('Real model answer');expect(ai.verified()).toBe(true);
 });
 it('includes only explicitly selected workspace data, never service tokens',async()=>{
  const {ai,fetch}=await connect();const bb=TestBed.inject(BitbucketConnectionService);const sonar=TestBed.inject(SonarqubeService);
  bb.connected.set(true);bb.pullRequests.set([{id:17,title:'Fix form',state:'OPEN',toRef:{repository:{slug:'frontend',project:{key:'WEB'}}}}]);sonar.context.set({project:'frontend',branch:'Feature',server:'private-url'});sonar.result.set({component:{key:'frontend',measures:[{metric:'coverage',value:'0'}]}});
  await ai.ask('Explain', '',true);const request=fetch.mock.calls[1][1].body;expect(request).toContain('workspaceData');expect(request).toContain('Fix form');expect(request).toContain('coverage');expect(request).not.toContain('private-url');expect(request).not.toContain('test-only-maas-key');
 });
 it('reports model allowlist errors without fabricating an answer or invalidating a valid key',async()=>{
  const {ai}=await connect({ok:false,status:401,json:async()=>({error:{code:'ModelArts.81015'}})});expect(await ai.ask('Hello')).toBe(false);expect(ai.error()).toContain('no autoriza este modelo');expect(ai.connected()).toBe(true);expect(ai.messages()).toEqual([]);
 });
 it('rejects empty answers and clears credentials and conversation on disconnect',async()=>{
  const {ai,fetch}=await connect({ok:true,json:async()=>({choices:[{message:{content:''}}]})});await ai.ask('Hello');expect(ai.error()).toContain('no devolvió texto');expect(ai.messages()).toEqual([]);ai.disconnect();const count=fetch.mock.calls.length;await ai.ask('Hello');expect(fetch.mock.calls.length).toBe(count);expect(ai.connected()).toBe(false);expect(ai.verified()).toBe(false);
 });
});