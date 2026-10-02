import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class ActionStore{
  constructor(path){
    this.path=path;
    this.items=new Map();
  }

  async load(){
    try{
      const parsed=JSON.parse(await readFile(this.path,"utf8"));
      for(const item of Array.isArray(parsed.items)?parsed.items:[]){
        this.items.set(item.id,item);
      }
    }catch{
      // First run: no action ledger exists yet.
    }
  }

  get(id){
    return this.items.get(id)??null;
  }

  findByIdempotencyKey(key){
    if(!key)return null;
    for(const item of this.items.values()){
      if(item.idempotencyKey===key)return item;
    }
    return null;
  }

  list(){
    return [...this.items.values()];
  }

  async put(item){
    this.items.set(item.id,item);
    await mkdir(dirname(this.path),{recursive:true});
    const tmp=`${this.path}.tmp`;
    await writeFile(tmp,JSON.stringify({
      schemaVersion:"1.1",
      items:[...this.items.values()],
    },null,2),"utf8");
    await rename(tmp,this.path);
    return item;
  }
}
