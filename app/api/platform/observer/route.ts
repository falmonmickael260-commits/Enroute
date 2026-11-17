import { observerResponse } from '../../../../admin-observer/server.mjs';
export async function POST(request:Request){
  return observerResponse(request,'kilomax',async(code,instance)=>{
    const key=process.env.GAME_SUPABASE_SERVICE_ROLE_KEY;
    if(!key)throw new Error('Mode spectateur indisponible.');
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://wcdoavbmexzgjhmmrsvj.supabase.co';
    const response=await fetch(`${url}/rest/v1/rpc/platform_observer`,{method:'POST',
      headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({p_code:code,p_instance:instance}),cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Observation indisponible.');
    return response.json();
  });
}
