import asyncio, json
from playwright.async_api import async_playwright
INIT = open('bt_test.py').read().split('INIT = """')[1].split('"""')[0]
SB = r"""
window.__db = {
 'days/2026-09-29': {journal:[{tag:'trading',text:'Waited for the 9:45 retest, felt patient',at:1}], tasks:[{text:'Edit the Sledge B reel',done:false},{text:'Old done thing',done:true}], meals:[{name:'Chipotle bowl',kcal:900,p:55}], trades:[{pnl:120,rules:{plan:true,size:true,noRevenge:true,noFomo:true,window:true}}]},
 'days/2026-09-30': {tasks:[{text:'Call uncle about brick shoot',done:false}], journal:[{tag:'family',text:'Took my brothers and sister to the park',at:5},{tag:'business',text:'Sledge B venue walkthrough went well',at:6},{tag:'fitness',text:'Leg day, hit a PR on squats',at:7},{tag:'raw',text:'raw dump',hidden:true,at:8},{tag:'journal',text:'Felt locked in today',at:9}], ideas:[{area:'content',text:'BTS reel of the venue build'}]},
 'days/2026-09-15': {journal:[{tag:'trading',text:'Revenge traded after the first loss, never again',at:2}]}
};
function q(path){ return { _p:null, select(){return this}, eq(k,v){this._p=v; return this}, like(){ this._like=true; return this},
  maybeSingle(){ const d=window.__db[this._p]; return Promise.resolve({data: d?{data:JSON.parse(JSON.stringify(d))}:null, error:null}); },
  then(res){ res({data:Object.keys(window.__db).filter(k=>k.startsWith('days/')).map(k=>({path:k,data:JSON.parse(JSON.stringify(window.__db[k]))})), error:null}); },
  upsert(row){ window.__db[row.path]=JSON.parse(JSON.stringify(row.data)); return Promise.resolve({error:null}); } }; }
window.supabase = { createClient(){ return { auth:{ getSession: async()=>({data:{session:{user:{id:'u1'}}}}) }, from(){ return q(); }, channel(){ return {on(){return this}, subscribe(){}} } }; } };
"""
# scripted Claude replies
SCRIPT = []
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1536,'height':864}); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            if 'supabase' in u: return await r.fulfill(content_type='application/javascript', body=SB)
            await (r.continue_() if (u.startswith('file:') or u.startswith('data:')) else r.abort())
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(9000)
        await pg.evaluate("document.getElementById('activate').classList.remove('show')")
        async def cmd(c, w=700):
            await pg.fill('#cmd', c); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(w); return await pg.inner_text('#reply')
        print('say :', await cmd('show me my journal entries'))
        print('open:', await pg.evaluate("JV_journal.isOpen()"))
        print('cols:', await pg.evaluate("[...document.querySelectorAll('#jrPanel .cat h3')].map(h=>h.innerText.replace(/\\n/g,' '))"))
        await pg.wait_for_timeout(600); await pg.screenshot(path='/home/claude/Jarvis/final/journal-screen.png')
        print('week:', await cmd('journal entries this week'))
        print('log not hijacked:', await cmd('log to cole journal that I felt calm', 300)[:0] if False else 'skip')
        print('close:', await cmd('close journal'), await pg.evaluate("JV_journal.isOpen()"))
        print('errors', errs); await b.close()
asyncio.run(main())
