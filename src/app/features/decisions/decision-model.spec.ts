import {describe,expect,it} from 'vitest';
import {createPrRecords} from './decision-mocks';
import {developerStats,evaluatePr,recommendation,summarize} from './decision-model';
import {csvReport,reportHtml,reportPayload} from './decision-exports';

describe('Decision policy and consistent demo indicators',()=>{
 it('provides deterministic fictional records and all four decision scenarios',()=>{
  const records=createPrRecords();expect(records).toEqual(createPrRecords());expect(new Set(records.map(pr=>pr.key)).size).toBe(records.length);expect(new Set(records.map(pr=>recommendation(evaluatePr(pr))))).toEqual(new Set(['ready','review','blocked','pending']));expect(records.every(pr=>pr.author.name.split(' ').length>=2&&/^[0-9a-f]{12}$/.test(pr.commit))).toBe(true);
 });
 it('keeps half the PRs fully compliant and distributes the remaining cases consistently each month',()=>{
  const records=createPrRecords();const stats=summarize(records);expect(stats).toMatchObject({total:36,ready:18,blocked:9,review:6,pending:3});
  for(const month of new Set(records.map(pr=>pr.date.slice(0,7))))expect(summarize(records.filter(pr=>pr.date.startsWith(month)))).toMatchObject({total:12,ready:6,blocked:3,review:2,pending:1});
  for(const pr of records.filter(pr=>recommendation(evaluatePr(pr))==='ready'))expect(evaluatePr(pr).every(check=>check.status==='passed')).toBe(true);
 });
 it('never recommends ready for failed or missing controls',()=>{
  for(const pr of createPrRecords()){const checks=evaluatePr(pr);if(checks.some(check=>check.status==='failed'))expect(recommendation(checks)).toBe('blocked');else if(checks.some(check=>check.status==='pending'))expect(recommendation(checks)).toBe('pending');}
 });
 it('keeps real zero distinct from missing coverage and flags stale evidence',()=>{
  const records=createPrRecords();expect(evaluatePr(records.find(pr=>pr.sonar.coverage===0)!).find(check=>check.id==='coverage')?.evidence).toContain('0%');expect(evaluatePr(records[5]).find(check=>check.id==='coverage')?.status).toBe('pending');expect(recommendation(evaluatePr(records.find(pr=>pr.sonar.commit!==null&&pr.sonar.commit!==pr.commit)!))).toBe('pending');
 });
 it('does not treat reviewed hotspots as confirmed vulnerabilities or missing pipelines as success',()=>{
  const records=createPrRecords();expect(evaluatePr(records[11]).find(check=>check.id==='security')?.status).toBe('warning');expect(evaluatePr(records.find(pr=>pr.jenkins.status==='IN_PROGRESS')!).find(check=>check.id==='jenkins')?.status).toBe('pending');expect(evaluatePr(records[2]).find(check=>check.id==='jenkins')?.status).toBe('failed');
 });
 it('changes the recommendation without rewriting historical approvals',()=>{
  const pr=createPrRecords()[0];expect(pr.outcome).toBe('approved');expect(recommendation(evaluatePr(pr,80))).toBe('ready');expect(recommendation(evaluatePr(pr,90))).toBe('blocked');expect(pr.outcome).toBe('approved');
 });
 it('excludes absent and stale coverage from averages while preserving zero',()=>{
  const records=createPrRecords();expect(summarize([records[0],records.find(pr=>pr.sonar.coverage===0)!,records[5],records.find(pr=>pr.sonar.commit!==null&&pr.sonar.commit!==pr.commit)!]).coverage).toBe(42);expect(summarize([]).coverage).toBeNull();
 });
 it('keeps developer totals and recorded decisions consistent with the filtered population',()=>{
  const records=createPrRecords().filter(pr=>pr.project==='COB');const groups=developerStats(records);expect(groups.reduce((sum,row)=>sum+row.total,0)).toBe(records.length);expect(groups.reduce((sum,row)=>sum+row.approved,0)).toBe(summarize(records).approved);const stats=summarize(records);expect(stats.ready+stats.blocked+stats.review+stats.pending).toBe(stats.total);
 });
 it('exports an explicitly simulated report with escaped content and safe CSV cells',()=>{
  const pr={...createPrRecords()[0],title:'<script>alert(1)</script>',author:{id:'demo',name:'=CMD()'}};const html=reportHtml(pr,80);expect(html).not.toContain('DATOS SIMULADOS');expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(reportPayload(pr,80).source).toBe('LOCAL');expect(csvReport([pr],80)).toContain("'=CMD()");
 });
});