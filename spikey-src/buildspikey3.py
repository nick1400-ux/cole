import os
tpl=open('src/v6-template.html').read(); eng=open('src/engine6.js').read(); common=open('src/themes/common-core.js').read()
cole=open('src/tradelog.js').read()+'\n'+open('src/cole.js').read(); spot=open('src/spotify.js').read(); brain=open('src/brain.js').read(); setup=open('src/setup.js').read(); slides=open('src/slides.js').read(); bt=open('src/backtest.js').read(); learn=open('src/learn.js').read(); jr=open('src/journal.js').read(); cust=open('src/custom.js').read(); assist=open('src/assist.js').read(); router=open('src/router.js').read(); stest=open('src/selftest.js').read()
css=open('src/themes/nightops.css').read()+'\n'+open('src/themes/no-redroom.css').read()
js=(common+'\n'+open('src/themes/nightops.js').read()+'\n'+open('src/themes/logo3d.js').read()).replace("'J.A.R.V.I.S — '","'SPIKEY — '")
engine_block = cole + '\n</script>\n<script>\n' + learn + '\n</script>\n<script>\n' + spot + '\n</script>\n<script>\n' + brain + '\n</script>\n<script>\n' + eng + '\n</script>\n<script>\n' + bt + '\n</script>\n<script>\n' + jr + '\n</script>\n<script>\n' + cust + '\n</script>\n<script>\n' + assist + '\n</script>\n<script>\n' + router + '\n</script>\n<script>\n' + setup + '\n</script>\n<script>\n' + slides + '\n</script>\n<script>\n' + stest
s=(tpl.replace('J.A.R.V.I.S. · {{THEME_NAME}}','Spikey').replace('{{THEME_ID}}','nightops').replace('{{MARK}}','SPIKEY <b>×</b> SLEDGE B')
   .replace('{{FONTS}}','family=Space+Grotesk:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500')
   .replace('{{THEME_CSS}}',css).replace('{{THEME_JS}}',js).replace('{{ENGINE}}', engine_block))
assert '{{' not in s
open('final/spikey.html','w').write(s)
os.makedirs('/home/claude/cole/spikey', exist_ok=True)
open('/home/claude/cole/spikey/index.html','w').write(s)
print(len(s))
