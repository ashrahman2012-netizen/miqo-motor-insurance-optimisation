export class EventStream{
  constructor({heartbeatMs=15000}={}){
    this.clients=new Set();
    this.heartbeatMs=heartbeatMs;
  }

  add(req,res,{state,events}={}){
    res.writeHead(200,{
      "Content-Type":"text/event-stream; charset=utf-8",
      "Cache-Control":"no-store",
      Connection:"keep-alive",
      "X-Accel-Buffering":"no",
    });
    res.write("retry: 3000\n\n");
    if(state)res.write("event: state\ndata: "+JSON.stringify(state)+"\n\n");
    for(const event of (events??[]).slice(-25)){
      res.write("event: cc4\ndata: "+JSON.stringify(event)+"\n\n");
    }
    const client={res,timer:setInterval(()=>res.write(": heartbeat\n\n"),this.heartbeatMs)};
    this.clients.add(client);
    req.on("close",()=>this.remove(client));
  }

  remove(client){
    clearInterval(client.timer);
    this.clients.delete(client);
  }

  publish(type,payload){
    const frame="event: "+type+"\ndata: "+JSON.stringify(payload)+"\n\n";
    for(const client of [...this.clients]){
      try{client.res.write(frame)}catch{this.remove(client)}
    }
  }

  close(){
    for(const client of [...this.clients]){
      clearInterval(client.timer);
      try{client.res.end()}catch{}
    }
    this.clients.clear();
  }
}
