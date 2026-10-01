import asyncio, json
from playwright.async_api import async_playwright
INIT = open('bt_test.py').read().split('INIT = """')[1].split('"""')[0]
SB = open('assist_test.py').read().split('SB = r"""')[1].split('"""')[0]
SPIKEY_JS = r"""async () => {
  await JV_coleReady; const prompts=[]; const out={};
  const k = (d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))(new Date());
  window.__db['days/'+k] = {checkin:{plan:'Short below 42,180 · 1 MYM · max loss $100'}, trades:[]};
  const fake = reply => async p => { prompts.push(p); return reply; };
  // 1) new live trade, revenge flagged
  let r = await JV_coleLog("took a short at 42,100 on 2 MYM, stopped out for 30 points, was trying to get back the morning loss", fake({journal:[{tag:'trading',text:'Felt rushed'}], trades:[{existing:null,contract:'MYM',dir:'SHORT',qty:2,pnl:-30,r:-1,note:'trying to get back the loss',rules:{plan:true,size:false,noRevenge:false,noFomo:true,window:true}}]}));
  out.msg1 = r.message; out.after1 = JSON.parse(JSON.stringify(window.__db['days/'+k]));
  // 2) open trade, then close it -> update, not duplicate
  r = await JV_coleLog("got long 1 YM at the reclaim", fake({trades:[{existing:null,contract:'YM',dir:'LONG',qty:1,pnl:null,r:null,note:'reclaim',rules:{}}]}));
  out.msg2 = r.message;
  r = await JV_coleLog("closed that long for 20 points", fake({trades:[{existing:1,contract:'YM',dir:'LONG',qty:1,pnl:100,r:2,note:'closed at target',rules:{}}]}));
  out.msg3 = r.message;
  // 3) backtest / watched setup -> model returns nothing; junk without direction is dropped
  r = await JV_coleLog("in replay I took a long win 2R", fake({trades:[{existing:null,pnl:50}]}));
  out.msg4 = r.message;
  out.final = window.__db['days/'+k].trades; out.prompt2 = prompts[2];
  return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        # ---- Spikey ----
        ctx = await b.new_context(viewport={'width':1536,'height':864}); await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            if 'supabase' in u: return await r.fulfill(content_type='application/javascript', body=SB)
            await (r.continue_() if (u.startswith('file:') or u.startswith('data:')) else r.abort())
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append('spikey: '+str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(6000)
        o = await pg.evaluate(SPIKEY_JS)
        for k in ['msg1','msg2','msg3','msg4']: print(k, '->', o[k])
        f = o['final']; print('trades:', json.dumps(f)[:600]); print('lossAt set:', bool(o['after1'].get('lossAt')))
        assert len(f) == 2 and f[0]['dir']=='SHORT' and f[0]['pnl']==-30 and f[0]['rules']['noRevenge'] is False
        assert f[1]['pnl']==100 and f[1]['r']==2 and 'closed at target' in f[1]['note']
        assert 'Trades already logged today: #0' in o['prompt2'] and '#1: LONG 1 YM' in o['prompt2'] and 'Short below 42,180' in o['prompt2']
        print('pnl tile today:', await pg.inner_text('#pnlTodayTrades'), await pg.inner_text('#pnlTodayAmt'))
        # ---- Cole brain dump ----
        pg2 = await b.new_page(viewport={'width':430,'height':1400}); pg2.on('pageerror', lambda e: errs.append('cole: '+str(e)))
        await pg2.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:','data:')) else r.abort())
        await pg2.goto('file:///home/claude/cole/Cole%20app/index.html'); await pg2.wait_for_timeout(1200)
        await pg2.evaluate("""() => { window.__prompts=[]; sample={json: async p => { __prompts.push(p); return {journal:[{tag:'trading',text:'Felt rushed into the open'}], meals:[{name:'Chipotle bowl',kcal:900,p:55,c:90,f:30,cost:15}],
           trades:[{existing:null,contract:'MYM',dir:'SHORT',qty:1,pnl:-15,r:-1,note:'off my level, stopped out',rules:{plan:true,size:true,noRevenge:true,noFomo:true,window:true}}], coach:''}; }}; go('dump'); }""")
        await pg2.wait_for_timeout(300)
        await pg2.fill('#dumpText', 'Went into the open feeling rushed, took a short at 42,100 off my level, stopped out. Chipotle bowl 15 bucks.')
        await pg2.click('[data-act=sortDump]'); await pg2.wait_for_timeout(500)
        v = await pg2.inner_text('#view'); i = v.lower().find("here's how"); print('COLE REVIEW:', v[i:i+260].replace('\n',' | '))
        await pg2.screenshot(path='/tmp/claude-0/review.png'); await pg2.click('[data-act=saveDump]'); await pg2.wait_for_timeout(400)
        print('tab after save:', await pg2.evaluate('tab'), '| trades:', await pg2.evaluate('JSON.stringify(day().trades)'))
        v = await pg2.inner_text('#view'); i = v.lower().find("today's trades"); print('TRADE TAB:', v[i:i+120].replace('\n',' | '))
        assert await pg2.evaluate('day().trades.length') == 1
        assert 'Trades already logged today: none' in await pg2.evaluate('__prompts[0]')
        print('errors', errs); assert not errs
        await b.close(); print('PASS')
asyncio.run(main())
