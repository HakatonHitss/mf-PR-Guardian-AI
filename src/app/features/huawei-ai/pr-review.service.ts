import { Injectable, effect, inject, signal } from '@angular/core';
import { BitbucketConnectionService, Commit, PullRequest } from '../bitbucket/bitbucket-connection.service';

interface PathValue { toString?: string; components?: string[]; }
interface Change { type:string; path:PathValue; srcPath?:PathValue; }
interface DiffLine { line:string; truncated?:boolean|string; }
interface Segment { type:string; lines:DiffLine[]; truncated?:boolean|string; }
interface Hunk { sourceLine:number;sourceSpan:number;destinationLine:number;destinationSpan:number;segments:Segment[];truncated?:boolean|string; }
interface DiffFile { source?:PathValue;destination?:PathValue;hunks?:Hunk[];truncated?:boolean|string; }
export interface DiffResponse { diffs:DiffFile[];truncated?:boolean|string; }
export interface ChangedFile { path:string;oldPath?:string;type:string; }
export interface ReviewCommit { id:string;displayId:string;message:string;author:string;timestamp?:number; }
export interface PrSnapshot extends PullRequest { version?:number; }
export interface PrReview { pr:PrSnapshot;files:ChangedFile[];commits:ReviewCommit[];diff:string;serverTruncated:boolean;previewTruncated:boolean; }
const isTruncated=(value:unknown):boolean=>value===true || value==='true';
function pathText(path:PathValue|undefined):string {
  return typeof path?.toString==='string' ? path.toString : Array.isArray(path?.components) ? path.components.join('/') : '';
}
export function formatPrDiff(response:DiffResponse):{text:string;serverTruncated:boolean;previewTruncated:boolean} {
  if(!Array.isArray(response.diffs)) throw new Error('Bitbucket devolvió un diff con formato inválido.');
  const sections:string[]=[];
  let truncated=isTruncated(response.truncated);
  let length=0;
  let previewTruncated=false;
  for(const file of response.diffs) {
    truncated ||= isTruncated(file.truncated);
    const lines=[`--- ${pathText(file.source)||'/dev/null'}`,`+++ ${pathText(file.destination)||'/dev/null'}`];
    if(!file.hunks?.length) lines.push('(Sin líneas textuales: archivo binario o cambio sin contenido textual disponible.)');
    for(const hunk of file.hunks??[]) {
      truncated ||= isTruncated(hunk.truncated);
      lines.push(`@@ -${hunk.sourceLine},${hunk.sourceSpan} +${hunk.destinationLine},${hunk.destinationSpan} @@`);
      for(const segment of hunk.segments??[]) {
        truncated ||= isTruncated(segment.truncated);
        for(const line of segment.lines??[]) {
          truncated ||= isTruncated(line.truncated);
          lines.push(`${segment.type==='ADDED'?'+':segment.type==='REMOVED'?'-':' '}${line.line}`);
        }
      }
    }
    const text=lines.join('\n');
    if(length<60000) sections.push(text.slice(0,60000-length));
    length+=text.length+2;
    if(length>60000) previewTruncated=true;
  }
  return {text:sections.join('\n\n'),serverTruncated:truncated,previewTruncated};
}

@Injectable({providedIn:'root'})
export class PrReviewService {
  readonly bb=inject(BitbucketConnectionService);
  readonly selectedKey=signal('');
  readonly review=signal<PrReview|null>(null);
  readonly busy=signal(false);
  readonly error=signal('');
  private version=0;
  constructor(){effect(()=>{if(!this.bb.connected()) this.clear();});}
  clear():void {this.version++;this.review.set(null);this.busy.set(false);this.error.set('');}
  select(key:string):void {this.clear();this.selectedKey.set(key);}

  async load():Promise<void> {
    const selected=this.bb.pullRequests().find(pr=>this.bb.pullRequestKey(pr)===this.selectedKey());
    if(!selected || !this.bb.connected() || this.busy()) return;
    this.clear();const version=this.version;this.busy.set(true);
    const repo=selected.toRef.repository;
    const path=`/api/1.0/projects/${encodeURIComponent(repo.project.key)}/repos/${encodeURIComponent(repo.slug)}/pull-requests/${encodeURIComponent(selected.id)}`;
    try {
      const initial=await this.bb.readResource<PrSnapshot>(path);
      if(initial.id!==selected.id || !initial.fromRef?.latestCommit) throw new Error('Bitbucket no devolvió una referencia de origen válida para este PR.');
      const [changes,commits,diff]=await Promise.all([
        this.bb.readAll<Change>(`${path}/changes`),
        this.bb.readAll<Commit & {committerTimestamp?:number;author?:{name:string;displayName?:string}}>(`${path}/commits`),
        this.bb.readResource<DiffResponse>(`${path}/diff?contextLines=3&withComments=false`)
      ]);
      const final=await this.bb.readResource<PrSnapshot>(path);
      if(initial.version!==final.version || initial.fromRef?.latestCommit!==final.fromRef?.latestCommit || initial.toRef.latestCommit!==final.toRef.latestCommit) throw new Error('El PR cambió mientras se cargaban los datos. Vuelve a cargar para obtener una revisión consistente.');
      const formatted=formatPrDiff(diff);
      const files=changes.map(change=>{
        const path=pathText(change.path);if(!path || typeof change.type!=='string') throw new Error('Bitbucket devolvió una lista de archivos inválida.');
        return {path,oldPath:pathText(change.srcPath)||undefined,type:change.type};
      });
      const normalizedCommits=commits.map(commit=>({id:commit.id,displayId:commit.displayId,message:commit.message,author:commit.author?.displayName??commit.author?.name??'Sin autor publicado',timestamp:commit.committerTimestamp??commit.authorTimestamp})).sort((a,b)=>(b.timestamp??0)-(a.timestamp??0));
      if(version!==this.version) return;
      this.review.set({pr:initial,files,commits:normalizedCommits,diff:formatted.text,serverTruncated:formatted.serverTruncated,previewTruncated:formatted.previewTruncated});
    } catch(error){if(version===this.version) this.error.set(error instanceof Error?error.message:'No se pudo cargar el PR.');}
    finally{if(version===this.version) this.busy.set(false);}
  }

  context():object|null {
    const review=this.review();if(!review || !this.bb.connected() || this.bb.pullRequestKey(review.pr)!==this.selectedKey()) return null;
    return {
      id:review.pr.id,title:review.pr.title,state:review.pr.state,project:review.pr.toRef.repository.project.key,repository:review.pr.toRef.repository.slug,
      sourceCommit:review.pr.fromRef?.latestCommit,targetCommit:review.pr.toRef.latestCommit,
      files:review.files.slice(0,100),fileCount:review.files.length,filesOmitted:Math.max(0,review.files.length-100),
      commits:review.commits.slice(0,50),commitCount:review.commits.length,commitsOmitted:Math.max(0,review.commits.length-50),
      diff:review.diff.slice(0,20000),diffTruncated:review.serverTruncated||review.previewTruncated||review.diff.length>20000,
      scope:'Cambios del PR completo frente a su destino, no únicamente el último commit. La revisión de IA debe señalar si la evidencia está recortada.'
    };
  }
}