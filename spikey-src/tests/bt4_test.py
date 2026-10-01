import asyncio
from playwright.async_api import async_playwright
INIT = open('bt_test.py').read().split('INIT = """')[1].split('"""')[0]
PH = ["open a backtesting screen","can you open a back-testing screen","open up the back testing screen","pull up my backtest","start a backtesting session for me","let's backtest","time to backtest","bring up backtesting"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1536,'height':864}); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            await (r.continue_() if (u.startswith('file:') or u.startswith('data:')) else r.abort())
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(9000)
        await pg.evaluate("document.getElementById('activate').classList.remove('show')")
        op = lambda: pg.evaluate("document.getElementById('btPanel').classList.contains('open')")
        async def cmd(c, w=600):
            await pg.fill('#cmd', c); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(w); return await pg.inner_text('#reply')
        for ph in PH:
            r = await cmd(ph); o = await op(); print(f'{ph!r:45} open={o} | {r[:50]}')
            await cmd('minimize backtest')
        r = await cmd('long win 2R'); print('log:', r[:60])
        print('end:', (await cmd('end backtest'))[:60], await op())
        print('errors', errs); await b.close()
asyncio.run(main())
