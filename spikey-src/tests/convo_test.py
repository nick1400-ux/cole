import asyncio, json
from playwright.async_api import async_playwright
seen=[]
def reply(body):
    last = body['messages'][-1]['content']
    txt = last if isinstance(last,str) else ''
    seen.append(txt.split('\n')[0])
    fu = '[Heard WITHOUT' in txt
    q = txt.split('\n')[0].lower()
    if fu and ('mike' in q or 'charger' in q): out='IGNORE'
    elif 'france' in q: out='Paris.'
    elif 'spain' in q: out='Madrid.'
    elif 'italy' in q: out='Rome.'
    else: out='Sure.'
    return {"stop_reason":"end_turn","content":[{"type":"text","text":out}]}
INIT = """
try{ localStorage.setItem('spikey.claudeKey','x'); }catch(e){}
Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{ speak(u){ setTimeout(()=>{u.onstart&&u.onstart(); setTimeout(()=>u.onend&&u.onend(),120)},20) }, cancel(){}, getVoices(){return []}, speaking:false, onvoiceschanged:null }});
window.SpeechSynthesisUtterance = function(t){ this.text=t };
class FakeRec { constructor(){ window.__rec=this } start(){ setTimeout(()=>this.onstart&&this.onstart(),10) } stop(){} }
window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
window.__say = (t) => { const alt={transcript:t}; const res=[alt]; res.isFinal=true; window.__rec.onresult({resultIndex:0, results:[res]}); };
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u=r.request.url
            if 'api.anthropic.com' in u: await r.fulfill(status=200, content_type='application/json', body=json.dumps(reply(json.loads(r.request.post_data))))
            elif u.startswith('file:') or u.startswith('data:'): await r.continue_()
            else: await r.abort()
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(9000)
        st = lambda: pg.evaluate("[document.getElementById('stateLabel').textContent, document.getElementById('reply').textContent, !!JV.convo]")
        async def say(t, w=1500):
            await pg.evaluate(f"__say({json.dumps(t)})"); await pg.wait_for_timeout(w); print(f'{t!r:45} ->', await st())
        await say("spikey what's the capital of France")
        await say("and what about Spain")
        await say("hey Mike can you pass me the charger")
        await say("thanks")
        await say("what about Italy")
        await say("spikey what's the capital of France")
        await pg.wait_for_timeout(21000); print('after 21s silence      ->', await st())
        await say("what about Italy")
        print('brain saw:', seen); print('errors', errs); await b.close()
asyncio.run(main())
