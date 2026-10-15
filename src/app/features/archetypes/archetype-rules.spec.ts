import {describe,expect,it} from 'vitest';
import {deriveRules,evaluateRules,glob,parsePolicy,detectArchetype,GENERATOR_ROOT} from './archetype-rules';
const metadata='<archetype-descriptor><fileSets><fileSet packaged="true"><directory>src/main/java</directory></fileSet><fileSet packaged="true"><directory>src/main/java</directory><includes><include>**/kafka/**/*.java</include></includes><requiredProperties><requiredProperty key="includeKafka"/></requiredProperties></fileSet></fileSets></archetype-descriptor>';
describe('Archetype structural comparison',()=>{
 it('treats file extensions literally and supports zero or more package directories',()=>{
    expect(glob('package.json').test('packageXjson')).toBe(false);expect(glob('src/main/java/**/controller/*Controller.java').test('src/main/java/com/example/orders/controller/OrderController.java')).toBe(true);expect(glob('src/main/java/**/controller/*Controller.java').test('src/main/java/controller/OrderController.java')).toBe(true);
 });
 it('does not require sample feature filenames or example core business services',()=>{
  const rules=deriveRules('microfrontend',['package.json','src/app/core/services/template-api.service.ts','src/app/features/template/template.component.ts','src/app/app.config.ts'],{dependencies:{'@angular/core':'20'},scripts:{build:'ng build'}});
  expect(rules.some(rule=>rule.pattern.includes('template-api'))).toBe(false);expect(rules.some(rule=>rule.pattern.includes('template.component'))).toBe(false);expect(rules.find(rule=>rule.id==='directory:src/app/features')).toBeDefined();
  const result=evaluateRules(rules,['package.json','src/app/core/services/real.service.ts','src/app/features/orders/orders.ts','src/app/app.config.ts'],{dependencies:{'@angular/core':'20'},scripts:{build:'ng build'}},{});expect(result.every(rule=>rule.status==='passed')).toBe(true);
 });
 it('checks generated Java layout with package and renamed class-prefix placeholders',()=>{
  const rules=deriveRules('microservice',[GENERATOR_ROOT+'pom.xml',GENERATOR_ROOT+'src/main/java/controller/__classPrefix__Controller.java'],null,metadata);
    const result=evaluateRules(rules,['pom.xml','src/main/java/com/example/order/controller/OrderController.java'],null,{});expect(result.every(rule=>rule.status==='passed')).toBe(true);expect(rules.some(rule=>rule.pattern.includes('archetype-resources'))).toBe(false);
 });
 it('does not require optional Kafka when disabled or claim compliance when unspecified',()=>{
  const rules=deriveRules('microservice',[GENERATOR_ROOT+'src/main/java/kafka/service/KafkaProducer.java'],null,metadata);
  expect(evaluateRules(rules,[],null,{includeKafka:false})[0].status).toBe('not-applicable');expect(evaluateRules(rules,[],null,{includeKafka:null})[0].status).toBe('unknown');expect(evaluateRules(rules,[],null,{includeKafka:true})[0].status).toBe('missing');
 });
 it('supports explicit policies and never accepts malformed or duplicate rules',()=>{
  const policy={version:'1',rules:[{id:'docker',title:'Dockerfile',category:'Deploy',kind:'file',pattern:'Dockerfile'}]};expect(parsePolicy(JSON.stringify(policy)).version).toBe('1');expect(()=>parsePolicy(JSON.stringify({...policy,rules:[...policy.rules,...policy.rules]}))).toThrow();expect(()=>parsePolicy('{"rules":[]}')).toThrow();expect(()=>parsePolicy(JSON.stringify({...policy,rules:[{...policy.rules[0],contains:'never silently ignore'}]}))).toThrow();expect(()=>parsePolicy(JSON.stringify({...policy,rules:[{...policy.rules[0],expected:'unsupported on file'}]}))).toThrow();
 });
 it('reports unreadable packages as unknown and validates exact declarations only when required',()=>{
  const rule={id:'angular',title:'Angular',category:'Dependencies',kind:'dependency' as const,pattern:'@angular/core',expected:'20.3.17'};
  expect(evaluateRules([rule],[],null,{})[0].status).toBe('unknown');expect(evaluateRules([rule],[],{dependencies:{'@angular/core':'^20.3.17'}},{})[0].status).toBe('missing');expect(evaluateRules([rule],[],{dependencies:{'@angular/core':'20.3.17'}},{})[0].status).toBe('passed');
 });
 it('identifies technologies from evidence and leaves ambiguous Angular projects unidentified',()=>{
  const pkg={dependencies:{'@angular/core':'20'}};expect(detectArchetype(['src/public/federation.manifest.json'],pkg,'')).toBe('shell');expect(detectArchetype([],pkg,'module.exports={exposes:{}}')).toBe('microfrontend');expect(detectArchetype([],pkg,'// exposes: {}')).toBeNull();expect(detectArchetype(['pom.xml','src/main/java/org/example/App.java'],null,'')).toBe('microservice');
 });
});