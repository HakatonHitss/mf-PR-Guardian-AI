export type ArchetypeId='shell'|'microfrontend'|'microservice';
export type FeatureOptions=Record<string,boolean|null>;
export interface Rule {id:string;title:string;category:string;kind:'file'|'directory'|'dependency'|'script';pattern:string;feature?:string;expected?:string;}
export interface RuleResult extends Rule {status:'passed'|'missing'|'unknown'|'not-applicable';evidence:string;}
export interface PackageConfig {dependencies?:Record<string,string>;devDependencies?:Record<string,string>;scripts?:Record<string,string>;}
export const ARCHETYPES=[{id:'shell' as const,label:'Shell Angular',repo:'sh-template'},{id:'microfrontend' as const,label:'Microfrontend Angular',repo:'mf-template'},{id:'microservice' as const,label:'Microservicio Java',repo:'arquetipoj21opcionales'}];
export const GENERATOR_ROOT='src/main/resources/archetype-resources/';

export function glob(pattern:string):RegExp {
  let expression='';
  for(let index=0;index<pattern.length;index++){
    const char=pattern[index];
    if(char==='*'&&pattern[index+1]==='*'){if(pattern[index+2]==='/'){expression+='(?:.*/)?';index+=2;}else{expression+='.*';index++;}}
    else if(char==='*')expression+='[^/]*';else if(char==='?')expression+='[^/]';else expression+=char.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }
  return new RegExp(`^${expression}$`);
}
export function xmlDocument(text:string):Document {
  const document=new DOMParser().parseFromString(text,'application/xml');
  if(document.getElementsByTagName('parsererror').length)throw new Error('El descriptor Maven del arquetipo no es XML válido.');
  return document;
}
function category(path:string):string {return /Dockerfile|nginx\/|configs\//.test(path)?'Despliegue':/README|\.md$/.test(path)?'Documentación':/test|spec|lint|checkstyle/.test(path)?'Calidad':/^(src\/|libs\/)/.test(path)?'Estructura':'Configuración';}
function conditionalFeatures(metadata:string,path:string):string[] {
  const document=xmlDocument(metadata);const features=new Set<string>();
  for(const set of Array.from(document.getElementsByTagName('fileSet'))){
    const directory=set.getElementsByTagName('directory')[0]?.textContent?.trim()??'';
    const matches=Array.from(set.getElementsByTagName('include')).some(include=>glob(`${directory?directory+'/':''}${include.textContent?.trim()??''}`).test(path));
    if(matches)for(const property of Array.from(set.getElementsByTagName('requiredProperty'))){const key=property.getAttribute('key');if(key)features.add(key);}
  }
  return [...features];
}
export function deriveRules(type:ArchetypeId,baselineFiles:string[],pkg:PackageConfig|null,metadata=''):Rule[]{
  const rules:Rule[]=[];
  const files=type==='microservice'?baselineFiles.filter(path=>path.startsWith(GENERATOR_ROOT)).map(path=>path.slice(GENERATOR_ROOT.length)):baselineFiles;
  if(type==='microservice'&&!files.length)throw new Error('No se encontró archetype-resources en el generador Java de referencia.');
  const generatedMetadata=type==='microservice'?xmlDocument(metadata):null;
  const isPackaged=(path:string):boolean=>!!generatedMetadata&&Array.from(generatedMetadata.getElementsByTagName('fileSet')).some(set=>set.getAttribute('packaged')==='true'&&path.startsWith((set.getElementsByTagName('directory')[0]?.textContent?.trim()??'')+'/'));
  for(const path of files){
    if(type!=='microservice'&&(/^(\.agents\/|mock\/|images\/|src\/app\/features\/|src\/public\/)/.test(path)||/\.(spec|test)\./.test(path)||path==='skills-lock.json'||/lock\.(json|yaml)$/.test(path)))continue;
    if(type!=='microservice'&&path.startsWith('src/app/core/'))continue;
    const features=type==='microservice'?conditionalFeatures(metadata,path):[];
    if(features.length>1)throw new Error('Una ruta del arquetipo depende de múltiples opciones. Publica una política explícita para evaluarla.');
    let pattern=path.replace(/__[^/]+?__/g,'*');
    if(isPackaged(path))pattern=pattern.replace(/^(src\/(?:main|test)\/java\/)/,'$1**/');
    rules.push({id:`file:${path}`,title:path,category:category(path),kind:'file',pattern,...(features[0]?{feature:features[0]}:{})});
  }
  if(type!=='microservice'){
    for(const directory of ['src/app/core','src/app/features','src/public'])if(files.some(path=>path.startsWith(directory+'/')))rules.push({id:`directory:${directory}`,title:`Carpeta ${directory}`,category:'Estructura',kind:'directory',pattern:directory});
    for(const dependency of Object.keys(pkg?.dependencies??{}).filter(key=>key.startsWith('@claro/')||['@angular/core','@angular/router','@angular-architects/native-federation'].includes(key)))rules.push({id:`dependency:${dependency}`,title:`Dependencia ${dependency}`,category:'Dependencias',kind:'dependency',pattern:dependency});
    for(const script of ['build','test','lint'])if(pkg?.scripts?.[script])rules.push({id:`script:${script}`,title:`Script ${script}`,category:'Calidad',kind:'script',pattern:script});
  }
  return rules;
}
export function parsePolicy(text:string):{version:string;rules:Rule[]}{
  const policy=JSON.parse(text) as {version?:unknown;rules?:unknown};
  if(typeof policy.version!=='string'||!policy.version.trim()||!Array.isArray(policy.rules)||!policy.rules.length)throw new Error('La política debe declarar version y una lista de reglas no vacía.');
  if(Object.keys(policy).some(key=>!['version','rules'].includes(key)))throw new Error('La política contiene campos no soportados.');
  const ids=new Set<string>();
  for(const value of policy.rules){const rule=value as Rule;if(!rule||typeof rule.id!=='string'||!rule.id||ids.has(rule.id)||typeof rule.title!=='string'||typeof rule.category!=='string'||!['file','directory','dependency','script'].includes(rule.kind)||typeof rule.pattern!=='string'||!rule.pattern||rule.pattern.includes('..')||(rule.feature!==undefined&&typeof rule.feature!=='string')||(rule.expected!==undefined&&typeof rule.expected!=='string'))throw new Error('La política contiene reglas inválidas o identificadores repetidos.');if(Object.keys(rule).some(key=>!['id','title','category','kind','pattern','feature','expected'].includes(key))||(rule.expected!==undefined&&!['dependency','script'].includes(rule.kind))||(['file','directory'].includes(rule.kind)&&rule.pattern.startsWith('/')))throw new Error('La regla contiene condiciones no soportadas; no se puede certificar su cumplimiento.');glob(rule.pattern);ids.add(rule.id);}
  return policy as {version:string;rules:Rule[]};
}
export function evaluateRules(rules:Rule[],files:string[],pkg:PackageConfig|null,options:FeatureOptions):RuleResult[]{
  return rules.map(rule=>{
    if(rule.feature&&options[rule.feature]===false)return {...rule,status:'not-applicable',evidence:`Opción ${rule.feature} desactivada para este proyecto.`};
    if(rule.feature&&options[rule.feature]!==true)return {...rule,status:'unknown',evidence:`Indica si el proyecto utiliza ${rule.feature}.`};
    let evidence:string|undefined;
    if(rule.kind==='file')evidence=files.find(file=>glob(rule.pattern).test(file));
    else if(rule.kind==='directory')evidence=files.find(file=>file.startsWith(rule.pattern.replace(/\/$/,'')+'/'));
    else{
      if(!pkg)return {...rule,status:'unknown',evidence:'No se pudo evaluar package.json; esta regla no se puede dar por cumplida.'};
      const value=rule.kind==='dependency'?(pkg.dependencies?.[rule.pattern]??pkg.devDependencies?.[rule.pattern]):pkg.scripts?.[rule.pattern];
      if(typeof value==='string'&&value.trim()&&(rule.expected===undefined||rule.expected===value))evidence=`${rule.pattern}: ${value}`;
    }
    return {...rule,status:evidence?'passed':'missing',evidence:evidence??`No se encontró ${rule.kind==='dependency'?'la dependencia':rule.kind==='script'?'el script':'la ruta'}: ${rule.pattern}${rule.expected?' con declaración exacta '+rule.expected:''}.`};
  });
}
export function detectArchetype(files:string[],pkg:PackageConfig|null,federation:string):ArchetypeId|null{
  if(pkg?.dependencies?.['@angular/core']||pkg?.devDependencies?.['@angular/core']){
    const source=federation.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
    if(/\bexposes\s*:/.test(source))return 'microfrontend';
    if(files.includes('src/public/federation.manifest.json'))return 'shell';
    return null;
  }
  return files.includes('pom.xml')&&files.some(path=>path.startsWith('src/main/java/'))?'microservice':null;
}