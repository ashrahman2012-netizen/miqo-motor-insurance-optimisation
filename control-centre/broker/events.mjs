import { buildCanonicalState, normalizeSnapshot, normalizedEvent } from "./event-normalizer.mjs";

export class EventHub{
  constructor({store,stream}){
    this.store=store;
    this.stream=stream;
    this.previousSnapshot=null;
    this.snapshot=null;
    this.revision=0;
    this.state=buildCanonicalState(null,[],store.listNotifications(),0);
  }

  async ingestSnapshot(snapshot){
    const generated=normalizeSnapshot(snapshot,this.previousSnapshot);
    const accepted=[];
    for(const event of generated){
      const result=await this.store.append(event);
      if(result.accepted){
        accepted.push(result.event);
        this.stream.publish("cc4",result.event);
        this.stream.publish("notification",result.notification);
      }
    }
    this.previousSnapshot=snapshot;
    this.snapshot=snapshot;
    if(accepted.length||this.revision===0)this.revision++;
    this.state=buildCanonicalState(snapshot,this.store.listEvents(),this.store.listNotifications(),this.revision);
    this.stream.publish("state",this.state);
    return {accepted,state:this.state};
  }

  async systemEvent({eventType,severity="info",message,actionRequired=false,currentState={}}){
    const event=normalizedEvent({
      dedupeKey:`control-centre:${eventType}:${JSON.stringify(currentState)}`,
      source:{type:"control-centre",component:"cc4"},
      category:"system",eventType,severity,
      entity:{type:"component",id:"cc4",name:"CC4"},
      currentState,message,actionRequired,
    });
    const result=await this.store.append(event);
    if(result.accepted){
      this.revision++;
      this.stream.publish("cc4",result.event);
      this.stream.publish("notification",result.notification);
    }
    this.state=buildCanonicalState(this.snapshot,this.store.listEvents(),this.store.listNotifications(),this.revision);
    this.stream.publish("state",this.state);
    return result;
  }

  getState(){return structuredClone(this.state)}
}
