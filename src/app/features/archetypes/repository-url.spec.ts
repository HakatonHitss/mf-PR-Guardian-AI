import {describe,expect,it} from 'vitest';
import {repositoryFromUrl} from './repository-url';
const server='http://172.19.113.113';
describe('Bitbucket repository URLs',()=>{
 it('extracts CAJ, sh-caja and the exact branch from a browse URL',()=>{expect(repositoryFromUrl(server+'/projects/CAJ/repos/sh-caja/browse?at=refs%2Fheads%2FDesarrollo',server)).toEqual({project:'CAJ',repo:'sh-caja',ref:'refs/heads/Desarrollo'});});
 it('accepts repository URLs without branch and installations with context paths',()=>{expect(repositoryFromUrl(server+'/bitbucket/projects/CAJ/repos/sh-caja/',server+'/bitbucket').repo).toBe('sh-caja');expect(repositoryFromUrl(server+'/projects/CAJ/repos/sh-caja/browse',server).ref).toBeNull();});
 it('rejects other servers, embedded credentials and encoded slashes',()=>{expect(()=>repositoryFromUrl('http://other/projects/CAJ/repos/sh-caja',server)).toThrow();expect(()=>repositoryFromUrl('http://user:pass@172.19.113.113/projects/CAJ/repos/sh-caja',server)).toThrow();expect(()=>repositoryFromUrl(server+'/projects/CAJ/repos/a%2Fb',server)).toThrow();});
});