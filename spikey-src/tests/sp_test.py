import asyncio, json
from playwright.async_api import async_playwright
INIT = open('bt_test.py').read().split('INIT = """')[1].split('"""')[0] + r"""
localStorage.setItem('spikey.spotify.clientId','cid'); localStorage.setItem('spikey.spotify.refresh','R1');
localStorage.setItem('spikey.spotify.access','A0'); localStorage.setItem('spikey.spotify.expires', String(Date.now()-1000));
"""
state = {'refreshes':0, 'next':0, 'mode':'normal'}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(); errs=[]
        await ctx.add_init_script(INIT)
        async def router(r):
            u = r.request.url; H={'access-control-allow-origin':'*'}
            if 'accounts.spotify.com/api/token' in u:
                state['refreshes'] += 1; await asyncio.sleep(0.3)
                return await r.fulfill(status=200, content_type='application/json', headers=H, body=json.dumps({'access_token':'A%d'%state['refreshes'],'expires_in':3600,'refresh_token':'R%d'%(state['refreshes']+1)}))
            if 'api.spotify.com' in u:
                if r.request.method == 'OPTIONS': return await r.fulfill(status=204, headers={**H,'access-control-allow-headers':'*','access-control-allow-methods':'*'})
                if 'devices' in u: return await r.fulfill(status=200, content_type='application/json', headers=H, body=json.dumps({'devices':[{'id':'d1','name':'NICK-PC','type':'Computer','is_active':True}]}))
                if 'currently-playing' in u: return await r.fulfill(status=200, content_type='application/json', headers=H, body=json.dumps({'is_playing':True,'item':{'name':'Uh Uh','artists':[{'name':'Blac Youngsta'}],'album':{'images':[{'url':''},{'url':''}]}}}))
                if '/next' in u:
                    state['next'] += 1
                    if state['mode']=='flaky' and state['next']==1: return await r.abort()
                    if state['mode']=='401' and state['next']==1: return await r.fulfill(status=401, content_type='application/json', headers=H, body='{"error":{"status":401,"message":"The access token expired"}}')
                    return await r.fulfill(status=200, headers=H, body='ok-not-json')
            await (r.continue_() if u.startswith(('file:','data:')) else r.abort())
        await ctx.route('**/*', router)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/Jarvis/final/spikey.html'); await pg.wait_for_timeout(4000)
        async def cmd(c, w=2500):
            await pg.fill('#cmd', c); await pg.press('#cmd','Enter'); await pg.wait_for_timeout(w); return await pg.inner_text('#reply')
        print('refreshes after load (poll + card, should be 1):', state['refreshes'])
        for mode, c in [('normal','skip this song as well'), ('flaky','next song'), ('401','skip it')]:
            state['mode']=mode; state['next']=0
            r = await cmd(c); print(f'{mode:6} {c!r:25} next calls={state["next"]} reply={r!r}')
        print('last error:', await pg.evaluate("JV_spotify.lastError()"))
        print('errors', errs); await b.close()
asyncio.run(main())
