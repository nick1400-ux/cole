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
BAD = "TITLE: Protein Streak\nSUBTITLE: last 7 days\nLIVE: yes\n<<<HTML\n<div class=card><div class=k>Protein</div><div id=v class=big></div></div><script>undefinedFn();</script>\nHTML>>>"
GOOD = """TITLE: Protein Streak
SUBTITLE: last 7 days
LIVE: yes
<<<HTML
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;height:100%;padding:4px">
<div class=card><div class=k>Protein today</div><div id=v class=big></div></div>
<div class=card><div class=k>Days logged</div><div id=n class=big></div></div></div>
<script>const D=window.SPIKEY_DATA;const t=D.days[D.today]||{meals:[]};document.getElementById('v').textContent=t.meals.reduce((s,m)=>s+(m.p||0),0)+'g';document.getElementById('n').textContent=Object.keys(D.days).length;</script>
HTML>>>"""
SCRIPT=[]; GEN=[]
def msg(t): return {'content':[{'type':'text','text':t}],'stop_reason':'end_turn'}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1536,'height':864}); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            if 'supabase' in u: return await r.fulfill(content_type='application/javascript', body=SB)
            if 'api.anthropic.com' in u:
                gen = 'You build one slide' in (r.request.post_data or '')
                q = GEN if gen else SCRIPT
                body = q.pop(0) if q else msg('Done.')
                return await r.fulfill(content_type='application/json', body=json.dumps(body), headers={'access-control-allow-origin':'*'})
            await (r.continue_() if (u.startswith('file:') or u.startswith('data:')) else r.abort())
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(9000)
        await pg.evaluate("document.getElementById('activate').classList.remove('show')")
        async def cmd(c, w=900):
            await pg.fill('#cmd', c); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(w); return await pg.inner_text('#reply')
        SCRIPT.extend([
          {'content':[{'type':'tool_use','id':'t1','name':'create_slide','input':{'request':'my protein streak for the week'}}],'stop_reason':'tool_use'},
          msg("On it, building your protein slide.")]); GEN.extend([msg(BAD), msg(GOOD)])
        print('ask  :', await cmd('I need to see my protein streak for the week', 1500))
        await pg.wait_for_timeout(9000)
        print('reply:', await pg.inner_text('#reply'))
        print('custom:', await pg.evaluate("JSON.stringify(JV_custom.list())"))
        await pg.wait_for_function("!JV.speaking", timeout=20000); await pg.wait_for_timeout(1500)
        on = await pg.evaluate("(document.querySelector('.slide.on h2')||{}).innerText")
        print('on screen:', on)
        fr = pg.frame_locator('.slide.on iframe')
        print('slide content:', await fr.locator('#v').inner_text(), '/', await fr.locator('#n').inner_text())
        await pg.screenshot(path='/home/claude/Jarvis/final/custom-slide.png')
        print('voice show:', await cmd('show me the protein streak'))
        print('screen:', await pg.evaluate("JV_custom.openScreen('https://www.youtube.com/watch?v=dQw4w9WgXcQ','Video')"), await pg.evaluate("document.getElementById('webFrame').src"))
        print('close:', await cmd('close the video'), await pg.evaluate("JV_custom.isOpen()"))
        print('blocked site:', await pg.evaluate("JV_custom.openScreen('gmail.com')"))
        print('delete:', await cmd('delete the protein streak slide'), await pg.evaluate("JV_custom.list().length"))
        print('saved to cole:', 'spikey/slides' in await pg.evaluate("Object.keys(window.__db)"))
        print('errors', errs); await b.close()
asyncio.run(main())
