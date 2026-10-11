from pathlib import Path
import re,json,hashlib,sys,subprocess
web=Path(sys.argv[1]).resolve(); app=(web/'public/app.js').read_text(); css=(web/'public/styles.css').read_text(); out=Path(__file__).resolve().parents[1]/'DLSMagician/PreviewAssets'
assert subprocess.check_output(['git','-C',str(web),'rev-parse','HEAD'],text=True).strip() == '9ce9f9f29095fd2163ad9c08a9dbc63df244b8e0', 'Use the reviewed production source commit'
def fn(name):
 start=app.index('function '+name+'('); end=app.index('\n}\n',start)+3;return app[start:end]
icons=app[app.index('const ICONS ='):app.index('\n};',app.index('const ICONS ='))+3]
systems=app[app.index('const DESIGN_SYSTEMS ='):app.index('\n};',app.index('const DESIGN_SYSTEMS ='))+3]
names=['icon','escapeHtml','parseStructuredLanguage','stepText','prototypeActionLabel','renderGeneratedInterface','designSystemComponents','generatedOutput']
script='// Extracted unchanged functions from verified production public/app.js; see provenance.json.\n(function(root){\n'+icons+'\n'+systems+'\nconst state={designSystem:"dls"};\n'+'\n'.join(fn(n) for n in names)+'''\nroot.DLSLegacyWorkflow={parse:parseStructuredLanguage,render(generated,system){state.designSystem=system;return renderGeneratedInterface(generated);},output(generated,system){state.designSystem=system;return generatedOutput(generated);}};\n})(globalThis);\n'''
(out/'legacy-workflow.js').write_text(script)
# Preserve complete top-level CSS rules for prototype, symbols, icons and theme tokens.
rules=[];start=0;depth=0
for i,c in enumerate(css):
 if c=='{':depth+=1
 elif c=='}':
  depth-=1
  if depth==0:
   rule=css[start:i+1];start=i+1
   if any(x in rule.split('{',1)[0] for x in ['.prototype-','.icon','.brand-symbol',':root','[data-theme="light"]','.flow-empty','.empty-state-icon']):rules.append(rule.strip())
(out/'legacy-workflow.css').write_text('\n\n'.join(rules)+'\n')
p=json.loads((out/'provenance.json').read_text());p['legacyWorkflow']={'sourceCommit':'9ce9f9f29095fd2163ad9c08a9dbc63df244b8e0','source':'public/app.js + public/styles.css','functions':names,'appSourceSHA256':hashlib.sha256(app.encode()).hexdigest(),'styleSourceSHA256':hashlib.sha256(css.encode()).hexdigest(),'assetSHA256':{n:hashlib.sha256((out/n).read_bytes()).hexdigest() for n in ['legacy-workflow.js','legacy-workflow.css']}};(out/'provenance.json').write_text(json.dumps(p,indent=2)+'\n')
print('Extracted legacy renderer, parser, output metadata and prototype styling from production source.')
