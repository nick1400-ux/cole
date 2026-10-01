import asyncio, json
from playwright.async_api import async_playwright
INIT = open('bt_test.py').read().split('INIT = """')[1].split('"""')[0]
SB = open('assist_test.py').read().split('SB = r"""')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        # ---- Cole: edit rules ----
        pg = await b.new_page(viewport={'width':430,'height':1600}); pg.on('pageerror', lambda e: errs.append('cole: '+str(e)))
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:','data:')) else r.abort())
        await pg.goto('file:///home/claude/cole/Cole%20app/index.html'); await pg.wait_for_timeout(1000)
        await pg.evaluate("go('trade')"); await pg.wait_for_timeout(200)
        await pg.click('[data-act=editRules]'); await pg.wait_for_timeout(200)
        await pg.fill('#rlMax','3'); await pg.fill('#rlCool','20'); await pg.fill('#rlStart','09:45'); await pg.fill('#rlEnd','11:00')
        await pg.fill('#rlText_0','Entry came from a level on my plan')
        await pg.click('[data-delrule="3"]'); await pg.wait_for_timeout(200)          # remove FOMO
        assert await pg.input_value('#rlMax') == '3' and await pg.input_value('#rlText_0') == 'Entry came from a level on my plan'
        await pg.fill('#rlNew','Waited for a 5-minute close'); await pg.click('[data-act=addRule]'); await pg.wait_for_timeout(200)
        pass
        await pg.click('[data-act=saveRules]'); await pg.wait_for_timeout(300)
        c = await pg.evaluate("RC()")
        print('saved:', json.dumps({k:c[k] for k in ['maxTrades','winStart','winEnd','cooldown']}), [r['text'] for r in c['list']], 'retired:', c['retired'])
        assert c['maxTrades']==3 and c['winStart']=='09:45' and c['cooldown']==20 and len(c['list'])==5 and 'noFomo' in c['retired']
        assert json.loads(await pg.evaluate("localStorage.getItem('cole.rules')"))['maxTrades']==3
        v = await pg.inner_text('#view'); print('TRADE TAB:', v[v.find('Log a trade'):v.find('Log a trade')+40].replace('\n',' | '), '...', v[v.lower().find('my rules'):v.lower().find('my rules')+260].replace('\n',' | '))
        assert '0/3 today' in v and '9:45–11 window' in v
        boxes = await pg.evaluate("[...document.querySelectorAll('.rules input')].map(x=>x.id)"); print('form boxes:', boxes)
        # log a trade with every box checked -> clean
        for bx in boxes: await pg.check('#'+bx)
        await pg.fill('#tPnl','40'); await pg.click('[data-act=logTrade]'); await pg.wait_for_timeout(200)
        t = await pg.evaluate("day().trades[0]"); print('trade rules:', t['rules'], 'clean:', await pg.evaluate("tradeClean(day().trades[0])"))
        assert await pg.evaluate("tradeClean(day().trades[0])")
        sch = await pg.evaluate("sched(3).find(x=>x.id==='trade')"); print('schedule:', sch['t'], sch['detail']); assert sch['t']=='09:45'
        print('ai rules text:', await pg.evaluate("COLE_RULES.summary()"))
        # reload: rules persist
        await pg.reload(); await pg.wait_for_timeout(800); assert await pg.evaluate("RC().maxTrades") == 3
        # ---- Spikey reads meta/rules ----
        ctx = await b.new_context(viewport={'width':1536,'height':864}); await ctx.add_init_script(INIT)
        sb = SB.replace("window.__db = {", "window.__db = {\n 'meta/rules': " + json.dumps(c) + ",")
        async def router(r):
            u=r.request.url
            if 'supabase' in u: return await r.fulfill(content_type='application/javascript', body=sb)
            await (r.continue_() if (u.startswith('file:') or u.startswith('data:')) else r.abort())
        await ctx.route('**/*', router)
        sp = await ctx.new_page(); sp.on('pageerror', lambda e: errs.append('spikey: '+str(e)))
        await sp.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await sp.wait_for_timeout(6000)
        o = await sp.evaluate("({max: COLE_RULES.get().maxTrades, tile: document.getElementById('pnlTodayTrades').textContent, keys: COLE_RULES.keys(), schema: COLE_TRADES.prompt([], '').schema, spoken: COLE_RULES.spokenOf('r1'), retired: COLE_RULES.spokenOf('noFomo')})")
        print('spikey:', o)
        assert o['max']==3 and o['tile'].endswith('/3') and 'noFomo' not in o['keys'] and 'noFomo' not in o['schema']
        print('errors', errs); assert not errs
        await b.close(); print('PASS')
asyncio.run(main())
