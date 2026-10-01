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

import json, re
ROUTES = {
 "yo kill the journal real quick and pull up the back to sting thing": ["close journal", "let's start backtesting"],
 "bro i need to see how much protein i got in me today": ["open my diet tracking"],
 "get that diet stuff off my screen and show me my money": ["close it", "open my finances"],
 "throw a ten minute timer on for the chicken in the oven": ["set a 10 minute timer for chicken"],
 "knock that last objective off the list i already handled it": ["clear the objective list"],
 "shush that music for a sec": ["pause"],
 "who won the heat game last night": None,
}
def msg(t): return {'content':[{'type':'text','text':t}],'stop_reason':'end_turn'}
calls = {'router':0, 'brain':0}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1536,'height':864}); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            if 'supabase' in u: return await r.fulfill(content_type='application/javascript', body=SB)
            if 'api.anthropic.com' in u:
                pd = json.loads(r.request.post_data or '{}')
                if 'ears of Spikey' in str(pd.get('system','')):
                    calls['router'] += 1
                    said = re.search(r'Nick said: "(.*?)"', pd['messages'][0]['content']).group(1).lower()
                    c = ROUTES.get(said, None)
                    out = {'intent':'commands','commands':c} if c else {'intent':'brain'}
                    return await r.fulfill(content_type='application/json', body=json.dumps(msg(json.dumps(out))), headers={'access-control-allow-origin':'*'})
                calls['brain'] += 1
                return await r.fulfill(content_type='application/json', body=json.dumps(msg('Brain answered.')), headers={'access-control-allow-origin':'*'})
            await (r.continue_() if (u.startswith('file:') or u.startswith('data:')) else r.abort())
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(9000)
        await pg.evaluate("document.getElementById('activate').classList.remove('show')")
        async def cmd(c, w=2000):
            await pg.fill('#cmd', c); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(w); return await pg.inner_text('#reply')
        st = lambda: pg.evaluate("({journal: JV_journal.isOpen(), bt: !!document.querySelector('#btPanel.open'), slide: ((document.querySelector('#slides .slide.on h2')||{}).innerText||'logo').split('\\n')[0], timers: JV_assist.items().map(i=>i.label), objectives: JV_tasks.list().length})")
        await cmd('open my journal')
        for c in ROUTES:
            r = await cmd(c, 2500); print(f'{c!r:70} -> {await st()} | {r[:40]}')
        print('quick phrase still instant (no router):', end=' '); before = calls['router']; await cmd('open my journal'); print(calls['router'] == before)
        print('calls', calls); print('errors', errs); await b.close()
asyncio.run(main())
