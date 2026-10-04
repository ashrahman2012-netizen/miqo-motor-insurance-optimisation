export function notificationViewModel(items,{limit=250}={}){
  return (Array.isArray(items)?items:[])
    .slice(-limit)
    .sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(item=>({
      id:item.notificationId,
      severity:item.severity,
      title:item.title,
      message:item.message,
      source:item.source,
      timestamp:item.createdAt,
      acknowledged:Boolean(item.acknowledged),
      acknowledgedAt:item.acknowledgedAt??null,
    }));
}
