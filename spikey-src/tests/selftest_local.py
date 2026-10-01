import asyncio, json
from playwright.async_api import async_playwright
INIT = open('bt_test.py').read().split('INIT = """')[1].split('"""')[0]
SB = r"""
window.__db = {
 'days/2026-09-29': {journal:[{tag:'trading',text:'Waited for the 9:45 retest, felt patient',at:1}], tasks:[{text:'Edit the Sledge B reel',done:false},{text:'Old done thing',done:true}], meals:[{name:'Chipotle bowl',kcal:900,p:55}], trades:[{pnl:120,rules:{plan:true,size:true,noRevenge:true,noFomo:true,window:true}}]},
 'days/2026-09-30': {tasks:[{text:'Call uncle about brick shoot',done:false}]}
};
function q(path){ return { _p:null, select(){return this}, eq(k,v){this._p=v; return this}, like(){ this._like=true; return this},
  maybeSingle(){ const d=window.__db[this._p]; return Promise.resolve({data: d?{data:JSON.parse(JSON.stringify(d))}:null, error:null}); },
  then(res){ res({data:Object.keys(window.__db).filter(k=>k.startsWith('days/')).map(k=>({path:k,data:JSON.parse(JSON.stringify(window.__db[k]))})), error:null}); },
  upsert(row){ window.__db[row.path]=JSON.parse(JSON.stringify(row.data)); return Promise.resolve({error:null}); } }; }
window.supabase = { createClient(){ return { auth:{ getSession: async()=>({data:{session:{user:{id:'u1'}}}}) }, from(){ return q(); }, channel(){ return {on(){return this}, subscribe(){}} } }; } };
"""

import json
def msg(t): return {'content':[{'type':'text','text':t}],'stop_reason':'end_turn'}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1536,'height':864}); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            if 'supabase' in u: return await r.fulfill(content_type='application/javascript', body=SB)
            if 'api.anthropic.com' in u:
                pd = r.request.post_data or ''
                body = msg('{"events":[{"time":"08:30","title":"Jobless Claims","impact":"high"}]}') if 'economic calendar' in pd else msg('12 times 12 is 144.')
                return await r.fulfill(content_type='application/json', body=json.dumps(body), headers={'access-control-allow-origin':'*'})
            await (r.continue_() if (u.startswith('file:') or u.startswith('data:')) else r.abort())
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html?selftest=1', wait_until='domcontentloaded')
        await pg.wait_for_function("localStorage.getItem('spikey.selftest')", timeout=240000)
        r = json.loads(await pg.evaluate("localStorage.getItem('spikey.selftest')"))
        for x in r['results']: print('PASS' if x['ok'] else 'FAIL', x['name'], '|', x['info'][:90])
        print(r['pass'], '/', r['total']); await pg.screenshot(path='/home/claude/Jarvis/final/selftest-local.png')
        print('errors', errs); await b.close()
asyncio.run(main())
