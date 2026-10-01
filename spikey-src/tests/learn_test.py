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
# scripted Claude replies
SCRIPT = []
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1536,'height':864}); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            if 'supabase' in u: return await r.fulfill(content_type='application/javascript', body=SB)
            if 'api.anthropic.com' in u:
                body = SCRIPT.pop(0) if SCRIPT else {'content':[{'type':'text','text':'Done.'}],'stop_reason':'end_turn'}
                return await r.fulfill(content_type='application/json', body=json.dumps(body), headers={'access-control-allow-origin':'*'})
            await (r.continue_() if (u.startswith('file:') or u.startswith('data:')) else r.abort())
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(9000)
        await pg.evaluate("document.getElementById('activate').classList.remove('show')")
        async def cmd(c, w=900):
            await pg.fill('#cmd', c); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(w); return await pg.inner_text('#reply')
        tasks = lambda: pg.evaluate("[...document.querySelectorAll('#tasks li span')].map(x=>x.innerText)")
        print('objectives from Cole:', await tasks())
        print('add  :', await cmd('add task post the backtest recap'))
        await pg.wait_for_timeout(500)
        print('cole today tasks:', await pg.evaluate("window.__db['days/'+new Date().toLocaleDateString('en-CA')].tasks.map(t=>t.text+(t.done?' ✓':''))"))
        print('objectives now:', await tasks())
        print('done :', await cmd('complete task 2'))
        await pg.wait_for_timeout(500)
        print('29th tasks:', await pg.evaluate("window.__db['days/2026-09-29'].tasks.map(t=>t.text+(t.done?' ✓':''))"))
        print('objectives now:', await tasks())
        print('read_cole:', await pg.evaluate("JSON.stringify(JV_coleRead('2026-09-29','2026-09-29',['journal','meals']))"))
        # brain learns a rule
        SCRIPT.extend([
          {'content':[{'type':'tool_use','id':'t1','name':'learn','input':{'kind':'rule','text':'Call Nick "boss" instead of by name.'}}],'stop_reason':'tool_use'},
          {'content':[{'type':'text','text':'Got it, boss.'}],'stop_reason':'end_turn'},
          {'content':[{'type':'tool_use','id':'t2','name':'learn','input':{'kind':'shortcut','phrase':'game time','command':'open backtesting'}}],'stop_reason':'tool_use'},
          {'content':[{'type':'text','text':'Shortcut saved.'}],'stop_reason':'end_turn'}])
        print('teach:', await cmd('from now on call me boss instead of Nick', 1500))
        print('teach:', await cmd('when I say game time open the backtesting screen', 1500))
        print('learned:', await pg.evaluate("JSON.stringify(JV_learn.list())"))
        print('saved to cole:', 'spikey/learned' in await pg.evaluate("Object.keys(window.__db)"))
        print('prompt has rule:', await pg.evaluate("JV_learn.prompt().includes('boss')"))
        print('shortcut:', await cmd('game time'), '| bt open:', await pg.evaluate("document.getElementById('btPanel').classList.contains('open')"))
        await cmd('end backtest')
        print('what learned:', await cmd('what have you learned'))
        print('forget:', await cmd('forget game time'))
        await pg.click('#setupBtn'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='/home/claude/Jarvis/final/learn-setup.png')
        print('errors', errs); await b.close()
asyncio.run(main())
