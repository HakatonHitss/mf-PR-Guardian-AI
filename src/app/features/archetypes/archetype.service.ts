import { Injectable,effect,inject,signal } from '@angular/core';
import { BitbucketConnectionService } from '../bitbucket/bitbucket-connection.service';
import { ARCHETYPES,ArchetypeId,FeatureOptions,GENERATOR_ROOT,PackageConfig,RuleResult,deriveRules,detectArchetype,evaluateRules,parsePolicy } from './archetype-rules';
export interface RepositorySnapshot {project:string;repo:string;ref:string;commit:string;files:string[];pkg:PackageConfig|null;federation:string;}
export interface ArchetypeAssessment {key:string;date:string;type:ArchetypeId;target:Omit<RepositorySnapshot,'files'|'pkg'|'federation'>&{root:string};baseline:{project:string;repo:string;ref:string;commit:string};policyVersion:string|null;detected:ArchetypeId|null;results:RuleResult[];options:FeatureOptions;status:string;}
@Injectable({providedIn:'root'})
export class ArchetypeService{
 readonly bb=inject(BitbucketConnectionService);
 readonly busy=signal(false);readonly error=signal('');readonly assessment=signal<ArchetypeAssessment|null>(null);readonly history=signal<ArchetypeAssessment[]>([]);
 private version=0;
 constructor(){effect(()=>{if(!this.bb.connected()){this.version++;this.assessment.set(null);this.history.set([]);this.busy.set(false);}});}
 private path(project:string,repo:string):string{return `/api/1.0/projects/${encodeURIComponent(project)}/repos/${encodeURIComponent(repo)}`;}
 private async text(project:string,repo:string,path:string,commit:string):Promise<string>{
   const result=await this.bb.readResource<string>(`${this.path(project,repo)}/raw/${path.split('/').map(encodeURIComponent).join('/')}?at=${encodeURIComponent(commit)}`,'text');
   if(typeof result!=='string'||result.length>250000)throw new Error('Un archivo de configuración excede el tamaño permitido o no es texto.');return result;
 }
 private async snapshot(project:string,repo:string,ref:string,root=''):Promise<RepositorySnapshot>{
   const head=await this.bb.readResource<{values:{id:string}[]}>(`${this.path(project,repo)}/commits?limit=1${ref?'&until='+encodeURIComponent(ref):''}`);
   const commit=head.values?.[0]?.id;if(!commit)throw new Error('No se pudo resolver la rama o commit solicitado.');
   const allFiles=await this.bb.readAll<string>(`${this.path(project,repo)}/files?at=${encodeURIComponent(commit)}`);
   if(allFiles.some(path=>typeof path!=='string'))throw new Error('Bitbucket devolvió una lista de rutas inválida.');
   const prefix=root?root.replace(/\/$/,'')+'/':'';const files=allFiles.filter(path=>path.startsWith(prefix)).map(path=>path.slice(prefix.length));
   if(!files.length)throw new Error(root ? 'No hay archivos dentro de la carpeta '+root+'. Si el proyecto está en la raíz, deja vacía Carpeta del proyecto; no repitas el nombre del repositorio.' : 'El repositorio no contiene archivos en la revisión seleccionada.');
   let pkg:PackageConfig|null=null;
   if(files.includes('package.json')){pkg=JSON.parse(await this.text(project,repo,prefix+'package.json',commit)) as PackageConfig;if(!pkg||typeof pkg!=='object'||Array.isArray(pkg))throw new Error('package.json no tiene un formato válido.');}
   const federation=files.includes('federation.config.js')?await this.text(project,repo,prefix+'federation.config.js',commit):'';
   return {project,repo,ref,commit,files,pkg,federation};
 }
 async analyze(project:string,repo:string,ref:string,type:ArchetypeId|'auto',root:string,options:FeatureOptions):Promise<void>{
   if(this.busy()||!this.bb.connected())return;this.version++;const version=this.version;this.assessment.set(null);this.error.set('');this.busy.set(true);
   try{
    project=project.trim();repo=repo.trim();ref=ref.trim();root=root.trim().replace(/^\/+|\/+$/g,'');
    if(!/^[A-Za-z0-9_-]+$/.test(project)||!/^[-A-Za-z0-9_.]+$/.test(repo)||['.','..'].includes(repo))throw new Error('Proyecto o repositorio inválido. En repositorio usa solo el slug, como sh-caja; pega la URL en el formulario para extraer sus datos.');
    if(!project||!repo||root.split('/').some(part=>part==='..'||part==='.')||root.includes('\\'))throw new Error('Selecciona proyecto y repositorio; la raíz del módulo debe ser una ruta relativa válida.');
    const target=await this.snapshot(project,repo,ref,root);const detected=detectArchetype(target.files,target.pkg,target.federation);
    const expected=type==='auto'?detected:type;if(!expected)throw new Error('No se pudo identificar el arquetipo con evidencia suficiente. Selecciona explícitamente shell, microfrontend o microservicio.');
    const source=ARCHETYPES.find(item=>item.id===expected)!;const baseline=await this.snapshot('ARK',source.repo,'refs/heads/Desarrollo');
    const policyPath='.guardian/archetype-rules.json';let policyVersion:string|null=null;let results:RuleResult[];
    if(baseline.files.includes(policyPath)){
      const policy=parsePolicy(await this.text('ARK',source.repo,policyPath,baseline.commit));policyVersion=policy.version;
      results=evaluateRules(policy.rules,target.files,target.pkg,options);
    }else{
      const metadata=expected==='microservice'?await this.text('ARK',source.repo,'src/main/resources/META-INF/maven/archetype-metadata.xml',baseline.commit):'';
      const rules=deriveRules(expected,baseline.files,baseline.pkg,metadata);
      results=evaluateRules(rules,target.files,target.pkg,options);
    }
    if(detected&&detected!==expected)results.unshift({id:'project-type',title:'Tipo de proyecto frente al arquetipo elegido',category:'Tipo de proyecto',kind:'file',pattern:'',status:'missing',evidence:`Detectado ${detected}; se esperaba ${expected}.`});
    if(!detected)results.unshift({id:'project-type',title:'Identificación del tipo de proyecto',category:'Tipo de proyecto',kind:'file',pattern:'',status:'unknown',evidence:'Los archivos consultados no identifican inequívocamente el tipo; se usó tu selección manual.'});
    const missing=results.some(rule=>rule.status==='missing'),unknown=results.some(rule=>rule.status==='unknown');
    const evaluated=results.filter(rule=>rule.status==='passed'||rule.status==='missing').length;
    const status=policyVersion?(missing?'Incumple reglas publicadas':unknown||!evaluated?'Evaluación incompleta':'Cumple reglas evaluadas'):(missing?'Diferencias con la referencia':unknown||!evaluated?'Comparación incompleta':'Sin diferencias en lo evaluado');
    const {files:ignoredFiles,pkg:ignoredPackage,federation:ignoredFederation,...targetRef}=target;
    const result:ArchetypeAssessment={key:`${expected}/${source.repo}/${project}/${repo}/${root}/${target.commit}/${baseline.commit}/${JSON.stringify(Object.keys(options).sort().map(key=>[key,options[key]]))}`,date:new Date().toISOString(),type:expected,target:{...targetRef,root},baseline:{project:'ARK',repo:source.repo,ref:'refs/heads/Desarrollo',commit:baseline.commit},policyVersion,detected,results,options:{...options},status};
    if(version!==this.version)return;this.assessment.set(result);this.history.update(items=>[result,...items.filter(item=>item.key!==result.key)].slice(0,50));
   }catch(error){if(version===this.version)this.error.set(error instanceof Error?error.message:'No se pudo comparar el arquetipo.');}
   finally{if(version===this.version)this.busy.set(false);}
 }
}