import {describe,it,expect} from 'vitest';
import {createPrRecords} from './decision-mocks';
import {findingsFor,controlTotals} from './audit-insights';
import {evaluatePr,recommendation} from './decision-model';
describe('Quality chart evidence',()=>{
 it('excludes pending evidence from confirmed findings and keeps clean PRs clean',()=>{const records=createPrRecords();expect(findingsFor(records[0])).toEqual([]);expect(findingsFor(records[5])).toEqual([]);expect(findingsFor(records[4]).some(item=>item.severity==='critical')).toBe(true);expect(records.filter(pr=>recommendation(evaluatePr(pr))==='ready').length).toBe(18);});
 it('keeps every stacked control count equal to the filtered PR population',()=>{for(const records of [createPrRecords(),createPrRecords().filter(pr=>pr.project==='COB'),[]])for(const row of controlTotals(records)){expect(row.passed+row.failed+row.warning+row.pending).toBe(records.length);} });
});
