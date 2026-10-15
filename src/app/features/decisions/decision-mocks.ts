import {PullRequestRecord,evaluatePr,recommendation} from './decision-model';
const repositories=[{project:'COB',repo:'biometric-local',type:'microservice' as const},{project:'COB',repo:'reniec-biometric',type:'microservice' as const},{project:'COBR',repo:'mf-buro',type:'microfrontend' as const},{project:'COBR',repo:'sh-buro',type:'shell' as const},{project:'CAJ',repo:'sh-caja',type:'shell' as const},{project:'CAL',repo:'ms-utl-remesa',type:'microservice' as const}];
const authors=['Valeria Mendoza','Diego Ramírez','Camila Torres','Andrés Rojas','Lucía Herrera','Mateo Salazar'];
function commitHash(index:number,revision:number):string{return ((index+17)*2654435761>>>0).toString(16).padStart(8,'0')+((revision+1)*2246822519>>>0).toString(16).padStart(8,'0').slice(0,4);}
const titles=['Validación de identidad','Validación de formularios','Integración de consulta','Ajuste de configuración','Control de errores','Actualización de componentes','Optimización de búsqueda','Estructura de pruebas','Manejo de respuestas','Validación de cobertura','Actualización de dependencias','Revisión de autenticación'];
// Each monthly group contains six healthy PRs and six varied review cases.
const scenarios=['healthy','healthy','pipeline','healthy','security','pending','healthy','documentation','healthy','coverage','healthy','hotspots'] as const;
export function createPrRecords():PullRequestRecord[]{
 return Array.from({length:36},(_,index)=>{
  const scenario=scenarios[index%12];const cycle=Math.floor(index/12);const repository=repositories[(index+Math.floor(index/12))%repositories.length];const id=17+index;const month=7+Math.floor(index/12);const day=1+index%12;const date=new Date(Date.UTC(2026,month,day,14,30)).toISOString();const commit=commitHash(index,2);
  const pr:PullRequestRecord={key:`${repository.project}/${repository.repo}/${id}`,id,project:repository.project,repo:repository.repo,title:`${index%3===0?'feat':'fix'}: ${titles[index%12]}`,author:{id:`dev-${1+(index+Math.floor(index/6))%6}`,name:authors[(index+Math.floor(index/6))%6]},branch:`Feature-${300871+index}`,commit,date,outcome:'pending',
   sonar:{alert_status:'OK',coverage:84+(index%5)*3,bugs:0,vulnerabilities:0,security_hotspots:0,code_smells:index%4,duplicated_lines_density:index%3,ncloc:2923+index*75,commit},
   jenkins:{status:'SUCCESS',build:120+index,duration:5+index%8,commit,stages:[{name:'Compilación',status:'SUCCESS'},{name:'Pruebas',status:'SUCCESS'},{name:'Análisis',status:'SUCCESS'}]},tests:{total:70+index*3,failed:0},archetype:{type:repository.type,status:'MATCH',differences:[]},changes:{files:3+index%9,added:45+index*4,removed:9+index%21},history:[]};
  if(scenario==='coverage'){pr.sonar.coverage=[76,0,72][cycle];pr.sonar.alert_status='ERROR';}
  if(scenario==='pipeline'&&cycle!==1){pr.jenkins.status='FAILURE';pr.jenkins.stages[1].status='FAILURE';pr.tests.failed=3;}
  if(scenario==='security'){pr.sonar.vulnerabilities=2;pr.sonar.security_hotspots=4;pr.sonar.alert_status='ERROR';}
  if(scenario==='pending'&&cycle===0){pr.sonar.alert_status=null;pr.sonar.coverage=null;pr.sonar.bugs=null;pr.sonar.vulnerabilities=null;pr.sonar.security_hotspots=null;pr.sonar.commit=null;}
  if(scenario==='pending'&&cycle===1){pr.jenkins.status='IN_PROGRESS';pr.jenkins.commit=null;pr.jenkins.stages[2].status='IN_PROGRESS';}
  if(scenario==='pending'&&cycle===2){pr.sonar.commit=commitHash(index,1);pr.jenkins.commit=commitHash(index,1);}
  if(scenario==='pipeline'&&cycle===1){pr.archetype.status='DIFFERENCES';pr.archetype.differences=[{rule:'Suite de pruebas',path:repository.type==='microservice'?'src/test/java/':'src/test-setup.ts',severity:'blocker',expected:'Estructura de ejecución de pruebas del arquetipo',actual:'Ruta requerida ausente',fix:'Incorporar la estructura de pruebas y ejecutar la suite.'}];}
  if(scenario==='documentation'){pr.archetype.status='DIFFERENCES';pr.archetype.differences=[{rule:'Documentación del despliegue',path:'README.md',severity:'warning',expected:'Pasos de despliegue y variables de entorno documentados',actual:'Falta la sección de variables requeridas',fix:'Documentar las variables y el procedimiento de despliegue.'}];}
  if(scenario==='hotspots'){pr.sonar.security_hotspots=2;}
  const decision=recommendation(evaluatePr(pr));if(index<24){pr.outcome=decision==='ready'||decision==='review'?'approved':decision==='blocked'?'rejected':'pending';}
  pr.history=[{date:new Date(Date.UTC(2026,month,day,9)).toISOString(),coverage:pr.sonar.coverage===null?null:Math.max(0,pr.sonar.coverage-14),commit:commitHash(index,0)},{date:new Date(Date.UTC(2026,month,day,12)).toISOString(),coverage:pr.sonar.coverage===null?null:Math.max(0,pr.sonar.coverage-6),commit:commitHash(index,1)},{date,coverage:pr.sonar.coverage,commit:pr.sonar.commit??'sin-analisis'}];
  return pr;
 });
}
