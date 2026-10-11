// Regenerate only from the independently checked production checkout, never native parsing.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=process.argv[2]; if(!root)throw Error('Pass verified production checkout');
const commit=require('child_process').execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(commit !== '9ce9f9f29095fd2163ad9c08a9dbc63df244b8e0')throw Error('Use the reviewed production source commit');
const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8'),server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function fn(name){const a=app.indexOf('function '+name+'(');return app.slice(a,app.indexOf('\n}\n',a)+3);}
const globals=app.slice(app.indexOf('const ICONS ='),app.indexOf('function savedDesignSystem()'));
const ctx=vm.createContext({});vm.runInContext(globals+'\nconst state={designSystem:"dls"};\n'+['icon','escapeHtml','parseStructuredLanguage','stepText','prototypeActionLabel','renderGeneratedInterface'].map(fn).join('\n'),ctx);
const seeds=[...server.matchAll(/(?:const baseLanguage = |structuredLanguage: )`([^`]+)`/g)].map(m=>{if(m[1].includes('${'))throw Error('Interpolated seed');return vm.runInNewContext('`'+m[1]+'`');});
const cases=seeds.map((source,i)=>({name:'production-seed-'+i,source}));
cases.push({name:'indented-mixed-case-crlf',source:'preamble 🪄\r\n  gIvEn \t\r\n An advertiser tracks offline data.\r\n\tWhEn\t\r\n SIGNALS and signal meet PERFORMANCE criteria.\r\n  tHeN \r\n Create a campaign workflow with insights and insight.\r\n  aNd\r\n Review dataset audience pixel.'},
{name:'tabs',source:'\tGIVEN\t\n\tA user needs help\n\tWHEN\n\tThey finish setup\n\tTHEN\n\tThey can continue'},
{name:'unicode-trim-and-boundaries',source:'\uFEFFGIVEN\u00a0\n广告campaign and campaign_2; INSIGHT, insights; signal SIGNALS\n\u2003WHEN\u2003\n match offline data / offline  data\nTHEN\n performance audience dataset pixel workflow'},
{name:'incomplete',source:'  GIVEN\n\nWHEN\n\nTHEN\n'},
{name:'repeated-and',source:'GIVEN\na user\nWHEN\nan action\nTHEN\nan outcome\nAND\nfirst\nAND\nsecond'},
{name:'component-dialog',source:' GIVEN\n a button named "Open"\n WHEN\n user clicks button "Open"\n THEN\n show dialog "Details" with content "Hello preview"'},
{name:'escaped-input',source:'GIVEN\na user <script>alert(1)</script>\nWHEN\nraw & quoted "input"\nTHEN\ncontinue safely'},
{name:'embedded-cr',source:'GI\rVEN\na cam\rpaign\nWHEN\nready\nTHEN\ncontinue'},
{name:'nel-not-js-trim',source:'GIVEN\n\u0085campaign\nWHEN\nready\nTHEN\ncontinue'});
const corpus=cases.map(c=>{ctx.source=c.source;ctx.name=c.name;const expected=vm.runInContext('parseStructuredLanguage(source,name)',ctx);const legacy={};for(const system of ['dls','material','ant']){ctx.system=system;legacy[system]=vm.runInContext('state.designSystem=system;renderGeneratedInterface(parseStructuredLanguage(source,name))',ctx)}return {...c,expected,legacy};});
const data=JSON.stringify({sourceCommit:'9ce9f9f29095fd2163ad9c08a9dbc63df244b8e0',appSHA256:sha(app),serverSHA256:sha(server),cases:corpus},null,2);
fs.writeFileSync(path.join(__dirname,'../DLSMagicianTests/WebParityFixtures.swift'),'// Generated from production Web, independent of native parser. See scripts/generate_web_corpus.cjs.\nimport Foundation\nenum WebParityFixtures { static let json = #"""\n'+data+'\n"""# }\n');
console.log(corpus.length+' independently generated Web golden cases');
