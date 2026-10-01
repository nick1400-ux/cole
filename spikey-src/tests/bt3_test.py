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
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(9000)
        await pg.evaluate("document.getElementById('activate').classList.remove('show')")
        open_ = lambda: pg.evaluate("document.getElementById('btPanel').classList.contains('open')")
        async def cmd(c, w=500):
            await pg.fill('#cmd', c); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(w); return await pg.inner_text('#reply')
        print('start :', await cmd("let's start backtesting"), '| full screen open:', await open_())
        await pg.click('#btPanel [data-d="short"]'); await pg.fill('#btNote', 'faded London high'); await pg.click('#btPanel [data-w="2"]')
        await pg.click('#btPanel [data-o="loss"]')
        print('voice :', await cmd('long win 1.5R'))
        await pg.click('#btPanel [data-o="be"]')
        await pg.wait_for_timeout(500)
        await pg.screenshot(path='/home/claude/Jarvis/final/bt-screen.png')
        print('rows  :', await pg.evaluate("[...document.querySelectorAll('#btPanel tbody tr')].map(r=>r.innerText.replace(/\\t/g,' | '))"))
        print('min   :', await cmd('minimize backtest'), '| open:', await open_(), '| badge:', await pg.inner_text('#btBadge'))
        await pg.click('#btBadge'); await pg.wait_for_timeout(400); print('badge click reopens:', await open_())
        await pg.click('#btMin'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='/home/claude/Jarvis/final/bt-minimized.png')
        print('end   :', await cmd('end backtest'), '| open:', await open_())
        print('errors', errs); await b.close()
asyncio.run(main())
