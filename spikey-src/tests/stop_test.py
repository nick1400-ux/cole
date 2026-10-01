import asyncio
from playwright.async_api import async_playwright
INIT = open('bt_test.py').read().split('INIT = """')[1].split('"""')[0] + r"""
Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{ _u:null, speak(u){ this._u=u; setTimeout(()=>{u.onstart&&u.onstart(); u._t=setTimeout(()=>u.onend&&u.onend(),6000)},10) }, cancel(){ const u=this._u; if(u){clearTimeout(u._t); this._u=null; setTimeout(()=>u.onend&&u.onend(),5);} }, getVoices(){return []}, speaking:false }});
class FakeRec { constructor(){ window.__rec=this; } start(){ this.onstart&&this.onstart(); } stop(){} abort(){} }
window.SpeechRecognition = window.webkitSpeechRecognition = FakeRec;
navigator.mediaDevices && (navigator.mediaDevices.getUserMedia = async()=>{ throw new Error('no mic') });
window.__hear = (t, fin) => { const alt=[{transcript:t}]; const r=Object.assign(alt,{isFinal:!!fin}); window.__rec.onresult({resultIndex:0, results:[r]}); };
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(); errs=[]
        await ctx.add_init_script(INIT)
        await ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:','data:')) else r.abort())
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(2500); await pg.evaluate("document.getElementById('activate') && document.getElementById('activate').classList.remove('show')"); await pg.wait_for_function('!JV.speaking && Date.now()>0', timeout=60000); await pg.wait_for_timeout(20000)
        print('rec exists:', await pg.evaluate("!!window.__rec"))
        sp = lambda: pg.evaluate("JV.speaking")
        # opening briefing is talking now
        await pg.evaluate("(async()=>{ await JV_say('This week you are up 200 dollars across 3 trades.'); await JV_say('Part two of the briefing. Lets make shit happen.'); })()"); await pg.wait_for_timeout(300); print("speaking during briefing:", await sp(), await pg.evaluate("[typeof JV_say, JV.mode, document.getElementById('reply').innerText]"))
        await pg.evaluate("__hear('this week you are up 200', false)"); await pg.wait_for_timeout(200)
        print('own voice echo ignored, still speaking:', await sp())
        await pg.evaluate("__hear('spikey stop', false)"); await pg.wait_for_timeout(400)
        print('after \"spikey stop\" speaking:', await sp(), '| state:', await pg.inner_text('#stateLabel'))
        await pg.wait_for_timeout(1500); print('rest of briefing swallowed, speaking:', await sp())
        await pg.fill('#cmd','what time is it'); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(300)
        print('new answer speaks:', await sp())
        await pg.evaluate("__hear('stop', false)"); await pg.wait_for_timeout(300)
        print('after plain \"stop\":', await sp())
        await pg.fill('#cmd','what time is it'); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(300)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300); print('after Esc:', await sp())
        print('errors', errs); await b.close()
asyncio.run(main())
