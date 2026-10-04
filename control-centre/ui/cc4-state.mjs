export class CC4State{
  constructor(){
    this.value={revision:0,updatedAt:null,components:{},notifications:{total:0,unread:0,actionRequired:0}};
    this.listeners=new Set();
  }
  set(next){
    if(!next||typeof next!=="object")return;
    if(Number(next.revision??0)<Number(this.value.revision??0))return;
    this.value=structuredClone(next);
    for(const listener of this.listeners)listener(this.snapshot());
  }
  snapshot(){return structuredClone(this.value)}
  subscribe(listener){
    this.listeners.add(listener);
    listener(this.snapshot());
    return ()=>this.listeners.delete(listener);
  }
}
