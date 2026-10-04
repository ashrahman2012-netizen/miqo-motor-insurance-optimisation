import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const SECRET_KEYS=/authorization|token|secret|password|cookie|api[-_]?key/i;

function sanitize(value){
  if(Array.isArray(value))return value.map(sanitize);
  if(value&&typeof value==="object"){
    return Object.fromEntries(Object.entries(value).filter(([key])=>!SECRET_KEYS.test(key)).map(([key,val])=>[key,sanitize(val)]));
  }
  return value;
}

export class EventStore{
  constructor(path,{maxEvents=500,maxNotifications=250}={}){
    this.path=path;
    this.maxEvents=maxEvents;
    this.maxNotifications=maxNotifications;
    this.events=[];
    this.notifications=[];
    this.dedupe=new Set();
  }

  async load(){
    try{
      const parsed=JSON.parse(await readFile(this.path,"utf8"));
      this.events=(Array.isArray(parsed.events)?parsed.events:[]).slice(-this.maxEvents);
      this.notifications=(Array.isArray(parsed.notifications)?parsed.notifications:[]).slice(-this.maxNotifications);
      this.dedupe=new Set(this.events.map(event=>event.dedupeKey).filter(Boolean));
    }catch{
      // First run: no CC4 event ledger yet.
    }
  }

  listEvents(){return [...this.events]}
  listNotifications(){return [...this.notifications]}

  async append(event){
    if(this.dedupe.has(event.dedupeKey))return {accepted:false,event:null,notification:null};
    const clean=sanitize(event);
    this.events.push(clean);
    this.dedupe.add(clean.dedupeKey);
    if(this.events.length>this.maxEvents){
      this.events=this.events.slice(-this.maxEvents);
      this.dedupe=new Set(this.events.map(item=>item.dedupeKey));
    }
    const notification={
      notificationId:clean.eventId,
      eventId:clean.eventId,
      severity:clean.actionRequired&&clean.severity==="failure"?"action_required":clean.severity,
      title:clean.entity?.name??clean.eventType,
      message:clean.message,
      source:clean.source?.type??"control-centre",
      createdAt:clean.observedAt,
      acknowledged:false,
      acknowledgedAt:null,
    };
    this.notifications.push(notification);
    if(this.notifications.length>this.maxNotifications){
      const acknowledged=this.notifications.filter(item=>item.acknowledged);
      const unresolved=this.notifications.filter(item=>!item.acknowledged);
      this.notifications=[...acknowledged,...unresolved].slice(-this.maxNotifications);
    }
    await this.persist();
    return {accepted:true,event:clean,notification};
  }

  async acknowledge(id){
    const item=this.notifications.find(notification=>notification.notificationId===id);
    if(!item)return null;
    if(!item.acknowledged){
      item.acknowledged=true;
      item.acknowledgedAt=new Date().toISOString();
      await this.persist();
    }
    return {...item};
  }

  async acknowledgeAll(){
    const now=new Date().toISOString();
    let changed=0;
    for(const item of this.notifications){
      if(!item.acknowledged){
        item.acknowledged=true;
        item.acknowledgedAt=now;
        changed++;
      }
    }
    if(changed)await this.persist();
    return changed;
  }

  async persist(){
    await mkdir(dirname(this.path),{recursive:true});
    const tmp=this.path+".tmp";
    await writeFile(tmp,JSON.stringify({schemaVersion:"1.0",events:this.events,notifications:this.notifications},null,2),"utf8");
    await rename(tmp,this.path);
  }
}
