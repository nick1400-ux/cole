import asyncio
from playwright.async_api import async_playwright
MOCK = r"""() => {
  const pad=n=>String(n).padStart(2,'0'), kf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const now=new Date(), mon=new Date(now); mon.setDate(now.getDate()-((now.getDay()+6)%7));
  const d=i=>{const x=new Date(mon); x.setDate(mon.getDate()+i); return kf(x)};
  const ok={plan:true,size:true,noRevenge:true,noFomo:true,window:true};
  const D={};
  D[d(0)]={trades:[{pnl:320,rules:ok},{pnl:-80,rules:ok}],gym:true,family:true,meals:[],spend:[{cat:'Gas',amt:45,what:'gas'}]};
  D[kf(now)]=Object.assign(D[kf(now)]||{}, {trades:[{pnl:-150,rules:ok},{pnl:-210,rules:{...ok,noRevenge:false}}], gym:true, reel:true, checkin:{mood:7}, slips:{a:1},
     meals:[{name:'Egg & turkey bagel',kcal:620,p:42,c:70,f:18,cost:9},{name:'Chipotle bowl double chicken',kcal:1050,p:78,c:95,f:34,cost:15}],
     spend:[{cat:'Business',amt:120,what:'Gaff tape + lights'},{cat:'Food',amt:22,what:'groceries'}],
     tasks:[{text:'Call the venue for Saturday',done:false},{text:'Edit the Sledge B recap',done:false}]});
  window.JV_coleDays = D; window.JV_coleTodos = () => ['Call the venue for Saturday','Edit the Sledge B recap','Send invoice'];
  window.JV_tasks.add('Buy gaff tape');
  document.getElementById('activate').classList.remove('show'); document.getElementById('holo').classList.remove('show');
  const sp=document.getElementById('setupPanel'); if(sp) sp.classList.remove('show');
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1536,'height':864}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        async def router(r):
            u=r.request.url
            if u.startswith('file:') or u.startswith('data:'): await r.continue_()
            else: await r.abort()
        await pg.route('**/*', router)
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html', wait_until='domcontentloaded'); await pg.wait_for_timeout(2500)
        await pg.evaluate(MOCK)
        for sl in ['fuel','trading','money','habits','agenda']:
            await pg.fill('#cmd', f'show my {sl if sl!="fuel" else "protein"}'); await pg.press('#cmd','Enter')
            await pg.evaluate("document.getElementById('activate').classList.remove('show')"); await pg.wait_for_timeout(1700)
            await pg.screenshot(path=f'/home/claude/Jarvis/final/slide-{sl}.png')
        # mid-transition frame
        await pg.evaluate("JV_slides.show('fuel')"); await pg.wait_for_timeout(250)
        await pg.screenshot(path='/home/claude/Jarvis/final/slide-transition.png')
        print('errors', errs); await b.close()
asyncio.run(main())
