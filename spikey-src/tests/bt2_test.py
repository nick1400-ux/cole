import asyncio
from playwright.async_api import async_playwright
INIT = open('/tmp/claude-0/-home-claude-cole/500f71a0-1e0b-5cd3-8249-242d6c7b10e9/scratchpad/bt_test.py').read().split('INIT = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1536,'height':864}); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            await (r.continue_() if (u.startswith('file:') or u.startswith('data:')) else r.abort())
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(10000)
        print('windows opened on dock:', await pg.evaluate("__opens.length"))
        print('setup has backtest section:', await pg.evaluate("document.getElementById('setupBtn').click(), document.getElementById('setupPanel').innerText.includes('Backtesting')"))
        await pg.evaluate("document.getElementById('setupPanel').classList.remove('show'); document.getElementById('activate').classList.remove('show')")
        async def cmd(c, w=500):
            await pg.fill('#cmd', c); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(w); return await pg.inner_text('#reply')
        print('start :', await cmd('spikey start backtesting'))
        print('log   :', await cmd('backtest long win 2R'))
        await pg.wait_for_timeout(16000)
        cur = await pg.evaluate("(document.querySelector('.slide.on h2')||{}).textContent")
        print('slide after 16s (should stay BACKTEST):', cur, '| windows opened:', await pg.evaluate("__opens.length"))
        await pg.screenshot(path='/home/claude/Jarvis/final/bt-monitor.png')
        print('end   :', await cmd('end backtest'))
        print('errors', errs); await b.close()
asyncio.run(main())
