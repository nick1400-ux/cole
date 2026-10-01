import asyncio
from playwright.async_api import async_playwright
INIT = open('bt_test.py').read().split('INIT = """')[1].split('"""')[0] + r"""
try{
 if (!sessionStorage.getItem('seeded')){ sessionStorage.setItem('seeded','1');
  localStorage.setItem('spikey.backtest.session', JSON.stringify({started: Date.now()-3*3600e3-60000, trades: [], lastBreak: Date.now()}));
  localStorage.setItem('spikey.assist.items', JSON.stringify([{id:'a',kind:'reminder',at:Date.now()-3600e3,label:'call uncle'},{id:'b',kind:'timer',at:Date.now()-7200e3,label:''},{id:'c',kind:'reminder',at:Date.now()+3600e3,label:'stretch'}]));
 }
}catch(e){}
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(); errs=[]
        await ctx.add_init_script(INIT)
        await ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:','data:')) else r.abort())
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        said=[]; await pg.expose_function('logSay', lambda t: said.append(t))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html'); await pg.wait_for_timeout(2000)
        await pg.evaluate("const o=window.JV_say; window.JV_say=t=>{logSay(t); return o(t)}")
        await pg.wait_for_timeout(52000)
        print('session after load:', await pg.evaluate("localStorage.getItem('spikey.backtest.session')"))
        print('history:', await pg.evaluate("JSON.parse(localStorage.getItem('spikey.backtest.history')||'[]').map(h=>h.autoEnded)"))
        print('items:', await pg.evaluate("JV_assist.items().map(i=>i.label)"))
        print('said:', [s for s in said if s and 'missed' in s], await pg.inner_text('#reply'))
        print('errors', errs); await b.close()
asyncio.run(main())
