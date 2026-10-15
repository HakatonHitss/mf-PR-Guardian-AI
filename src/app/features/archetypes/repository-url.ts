export function repositoryFromUrl(value:string,serverUrl:string):{project:string;repo:string;ref:string|null}{
 const url=new URL(value.trim());const server=new URL(serverUrl);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.origin!==server.origin)throw new Error('La URL debe pertenecer al mismo servidor Bitbucket configurado y no incluir credenciales.');
 const prefix=server.pathname.replace(/\/+$/,'');
 if(prefix&&!url.pathname.startsWith(prefix+'/'))throw new Error('La URL no pertenece al contexto de Bitbucket configurado.');
 const path=url.pathname.slice(prefix.length);
 const match=/^\/projects\/([^/]+)\/repos\/([^/]+)(?:\/browse(?:\/.*)?)?\/?$/.exec(path);
 if(!match)throw new Error('Pega una URL de repositorio con /projects/PROYECTO/repos/REPOSITORIO/browse.');
 const project=decodeURIComponent(match[1]),repo=decodeURIComponent(match[2]);
 if(!/^[A-Za-z0-9_-]+$/.test(project)||!/^[-A-Za-z0-9_.]+$/.test(repo)||['.','..'].includes(repo))throw new Error('La URL contiene un proyecto o repositorio inválido.');
 return {project,repo,ref:url.searchParams.get('at')};
}