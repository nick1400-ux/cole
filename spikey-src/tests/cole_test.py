import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':430,'height':1400}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:','data:')) else r.abort())
        await pg.goto('file:///home/claude/cole/Cole%20app/index.html'); await pg.wait_for_timeout(1500)
        await pg.evaluate("""spikeyBt={'a':{started:Date.now()-86400000,stats:{n:12,wins:7,losses:5,totalR:6.5,winRate:58,pf:2.1,mins:48}},'b':{started:Date.now(),stats:{n:4,wins:2,losses:2,totalR:1,winRate:50,pf:1.5,mins:20}}};
          spikeyLearned={rules:[{text:'Call Nick boss'}],shortcuts:[{phrase:'game time',command:'open backtesting'}]}; go('trade')""")
        await pg.wait_for_timeout(400)
        t = await pg.inner_text('#view'); print(len(t), await pg.evaluate('tab'), t[-500:])
        await pg.evaluate("go('mind')"); await pg.wait_for_timeout(300)
        t = await pg.inner_text('#view'); i = t.find('What Spikey'); print(t[i:i+120])
        print('errors', errs); await b.close()
asyncio.run(main())
