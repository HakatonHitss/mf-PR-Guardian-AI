export type Recommendation='ready'|'review'|'blocked'|'pending';
export type CheckStatus='passed'|'warning'|'failed'|'pending';
export interface Difference {rule:string;path:string;severity:'blocker'|'warning';expected:string;actual:string;fix:string;}
export interface PullRequestRecord{
 key:string;id:number;project:string;repo:string;title:string;author:{id:string;name:string};branch:string;commit:string;date:string;outcome:'approved'|'rejected'|'pending';
 sonar:{alert_status:'OK'|'ERROR'|null;coverage:number|null;bugs:number|null;vulnerabilities:number|null;security_hotspots:number|null;code_smells:number|null;duplicated_lines_density:number|null;ncloc:number;commit:string|null};
 jenkins:{status:'SUCCESS'|'FAILURE'|'UNSTABLE'|'IN_PROGRESS'|'NOT_BUILT';build:number;duration:number;commit:string|null;stages:{name:string;status:string}[]};
 tests:{total:number;failed:number};archetype:{type:'shell'|'microfrontend'|'microservice';status:'MATCH'|'DIFFERENCES'|'NOT_EVALUATED';differences:Difference[]};
 changes:{files:number;added:number;removed:number};history:{date:string;coverage:number|null;commit:string}[];
}
export interface PrCheck{id:string;label:string;category:string;status:CheckStatus;evidence:string;action:string;}
export const RECOMMENDATIONS:Record<Recommendation,{label:string;short:string;description:string}>={
 ready:{label:'Listo para revisión de aprobación',short:'Listos',description:'Todos los controles de la política de calidad están conformes.'},
 review:{label:'Requiere revisión de advertencias',short:'Con advertencias',description:'No hay bloqueos, pero quedan observaciones que deben revisarse.'},
 blocked:{label:'No cumple para aprobar',short:'Con bloqueos',description:'Hay controles fallidos que deben corregirse antes de aprobar.'},
 pending:{label:'Evidencia pendiente',short:'Pendientes',description:'Faltan resultados o no corresponden al commit actual.'}
};
export function evaluatePr(pr:PullRequestRecord,minimumCoverage=80):PrCheck[]{
 const measure=(value:number|null,suffix='')=>value===null?'Sin dato publicado':`${value}${suffix}`;
 const checks:PrCheck[]=[
  {id:'sonar',label:'Quality Gate SonarQube',category:'Quality Gate',status:pr.sonar.alert_status===null?'pending':pr.sonar.alert_status==='OK'?'passed':'failed',evidence:pr.sonar.alert_status??'Sin análisis disponible',action:'Revisar las condiciones fallidas del Quality Gate y repetir el análisis.'},
  {id:'coverage',label:'Cobertura de pruebas',category:'Cobertura insuficiente',status:pr.sonar.coverage===null?'pending':pr.sonar.coverage>=minimumCoverage?'passed':'failed',evidence:`Cobertura: ${measure(pr.sonar.coverage,'%')} · mínimo ${minimumCoverage}%`,action:'Agregar pruebas sobre los cambios hasta alcanzar el umbral definido.'},
  {id:'security',label:'Seguridad',category:'Seguridad',status:pr.sonar.vulnerabilities===null||pr.sonar.security_hotspots===null?'pending':pr.sonar.vulnerabilities>0?'failed':pr.sonar.security_hotspots>0?'warning':'passed',evidence:`${measure(pr.sonar.vulnerabilities)} vulnerabilidades · ${measure(pr.sonar.security_hotspots)} hotspots`,action:'Corregir vulnerabilidades y revisar hotspots; un hotspot no equivale a una vulnerabilidad confirmada.'},
  {id:'bugs',label:'Bugs',category:'Bugs',status:pr.sonar.bugs===null?'pending':pr.sonar.bugs>0?'failed':'passed',evidence:`${measure(pr.sonar.bugs)} bugs · ${measure(pr.sonar.code_smells)} code smells`,action:'Corregir los bugs y validar las rutas afectadas por el PR.'},
  {id:'jenkins',label:'Pipeline Jenkins',category:'Pipeline Jenkins',status:pr.jenkins.status==='SUCCESS'?'passed':pr.jenkins.status==='FAILURE'?'failed':pr.jenkins.status==='UNSTABLE'?'warning':'pending',evidence:`Build #${pr.jenkins.build} · ${pr.jenkins.status}`,action:'Revisar la etapa fallida o inestable y ejecutar nuevamente el pipeline.'},
  {id:'tests',label:'Pruebas automatizadas',category:'Pruebas fallidas',status:pr.tests.failed>0?'failed':pr.tests.total===0?'pending':'passed',evidence:`${pr.tests.total-pr.tests.failed}/${pr.tests.total} correctas · ${pr.tests.failed} fallidas`,action:'Revisar las pruebas fallidas y asegurar que se ejecuta la suite completa.'},
  {id:'archetype',label:'Arquetipo y estructura',category:'Diferencias de arquetipo',status:pr.archetype.status==='NOT_EVALUATED'?'pending':pr.archetype.differences.some(item=>item.severity==='blocker')?'failed':pr.archetype.differences.length?'warning':'passed',evidence:`${pr.archetype.type} · ${pr.archetype.status==='NOT_EVALUATED'?'sin evaluación':pr.archetype.differences.length+' diferencias'}`,action:'Comparar las rutas indicadas con el arquetipo y resolver las diferencias aplicables.'},
  {id:'commit',label:'Evidencia del commit actual',category:'Evidencia desactualizada',status:pr.sonar.commit===pr.commit&&pr.jenkins.commit===pr.commit?'passed':'pending',evidence:`Sonar: ${pr.sonar.commit===pr.commit?'actual':'pendiente o anterior'} · Jenkins: ${pr.jenkins.commit===pr.commit?'actual':'pendiente o anterior'}`,action:'Ejecutar análisis y pipeline para el último commit del PR.'}
 ];return checks;
}
export function recommendation(checks:PrCheck[]):Recommendation{return checks.some(check=>check.status==='failed')?'blocked':checks.some(check=>check.status==='pending')?'pending':checks.some(check=>check.status==='warning')?'review':'ready';}
export function summarize(prs:PullRequestRecord[],coverage=80){
 const recommendations={ready:0,review:0,blocked:0,pending:0};for(const pr of prs)recommendations[recommendation(evaluatePr(pr,coverage))]++;
 const values=prs.flatMap(pr=>pr.sonar.coverage===null||pr.sonar.commit!==pr.commit?[]:[pr.sonar.coverage]);
 return {total:prs.length,...recommendations,approved:prs.filter(pr=>pr.outcome==='approved').length,rejected:prs.filter(pr=>pr.outcome==='rejected').length,awaiting:prs.filter(pr=>pr.outcome==='pending').length,coverage:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};
}
export function recurringChecks(prs:PullRequestRecord[],coverage=80){const counts=new Map<string,{name:string;count:number}>();for(const pr of prs)for(const check of evaluatePr(pr,coverage))if(check.status==='failed'||check.status==='warning'){const entry=counts.get(check.id)??{name:check.category,count:0};entry.count++;counts.set(check.id,entry);}return [...counts].map(([id,value])=>({id,...value})).sort((a,b)=>b.count-a.count);}
export function developerStats(prs:PullRequestRecord[],coverage=80){return [...new Map(prs.map(pr=>[pr.author.id,pr.author])).values()].map(author=>({author,...summarize(prs.filter(pr=>pr.author.id===author.id),coverage)})).sort((a,b)=>b.total-a.total);}