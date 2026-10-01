import asyncio, json
from playwright.async_api import async_playwright
INIT = """
try{ localStorage.setItem('spikey.claudeKey','x'); }catch(e){}
Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{ speak(u){ setTimeout(()=>{u.onstart&&u.onstart(); setTimeout(()=>u.onend&&u.onend(),60)},10) }, cancel(){}, getVoices(){return []}, speaking:false }});
window.SpeechSynthesisUtterance = function(t){ this.text=t };
window.getScreenDetails = async () => { const sc=[{label:'HP 27f',availLeft:0,availTop:0,availWidth:1920,availHeight:1040,isInternal:false},{label:'HP E233',availLeft:-1920,availTop:0,availWidth:1920,availHeight:1040,isInternal:false},{label:'Built-in',availLeft:1920,availTop:200,availWidth:1536,availHeight:824,isInternal:true}]; return {screens:sc,currentScreen:sc[2]}; };
window.__opens=[]; window.open = (u,n,f) => { const w={name:n, closed:false, location:{href:'about:blank'}, focus(){}, moveTo(x,y){this.mv=[x,y]}, resizeTo(a,b){this.rs=[a,b]}}; window.__opens.push({u,n,f,w}); return w; };
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1536,'height':864}); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            if u.startswith('file:') or u.startswith('data:'): await r.continue_()
            else: await r.abort()
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(9500)
        print('dock auto-open:', await pg.evaluate("__opens.map(o=>[o.n,o.f])"), '| session started on dock?', await pg.evaluate("JV_backtest.active()"))
        # pick HP E233 in setup
        await pg.evaluate("document.getElementById('activate').classList.remove('show'); document.getElementById('setupBtn').click()"); await pg.wait_for_timeout(300)
        await pg.click('#btDetect'); await pg.wait_for_timeout(300)
        print('screens:', await pg.inner_text('#btScreens'))
        await pg.click('[data-sc="1"]'); await pg.wait_for_timeout(300)
        print('chosen:', await pg.evaluate("JSON.stringify(JV_backtest.cfg().screen)"))
        await pg.screenshot(path='/home/claude/Jarvis/final/bt-setup.png')
        await pg.evaluate("document.getElementById('setupPanel').classList.remove('show')")
        async def cmd(c, w=400):
            await pg.fill('#cmd', c); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(w); return await pg.inner_text('#reply')
        await pg.evaluate("window.__opens=[]")
        print('open      :', await cmd('spikey open backtesting'), '|', await pg.evaluate("__opens.map(o=>o.f)"))
        print('log 1     :', await cmd('backtest long win 2R'))
        print('log 2     :', await cmd('backtest short loss'))
        print('log 3     :', await cmd('backtest long win at 42100 1.5 R'))
        print('log 4     :', await cmd('backtest short breakeven'))
        print('log 5 (no prefix, session on):', await cmd('long win three R'))
        print('undo      :', await cmd('undo last backtest'))
        print('summary   :', await cmd("how's my backtest going"))
        print('badge     :', await pg.inner_text('#btBadge'))
        await pg.evaluate("document.getElementById('activate').classList.remove('show'); JV_slides.show('backtest')"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='/home/claude/Jarvis/final/bt-slide.png')
        print('end       :', await cmd('end backtest'))
        print('errors', errs); await b.close()
asyncio.run(main())
