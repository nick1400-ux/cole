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
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html'); await pg.wait_for_timeout(25000)
        print(await pg.evaluate("""(async()=>{ const log=[]; const t0=Date.now(); const L=m=>log.push((Date.now()-t0)+' '+m+' sp='+JV.speaking);
          const orig=speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak=u=>{L('speak '+u.text.slice(0,20)); orig(u)};
          const oc=speechSynthesis.cancel.bind(speechSynthesis); speechSynthesis.cancel=()=>{L('cancel'); oc()};
          JV_say('Part one up 200 dollars.').then(()=>L('p1 done')).then(()=>JV_say('Part two.')).then(()=>L('p2 done'));
          await new Promise(r=>setTimeout(r,300)); L('check');
          __hear('spikey stop', false); await new Promise(r=>setTimeout(r,300)); L('after stop');
          await new Promise(r=>setTimeout(r,1500)); L('end'); return log.join('\\n'); })()"""))
        print(errs); await b.close()
asyncio.run(main())
