from pathlib import Path
import json
import os
import shutil
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1360,'height':860},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    html=(root/'tests/browser-fixture.html').read_text()
    html=html.replace('<link rel="stylesheet" href="../public/component-preview.css">', '<style>'+(root/'public/component-preview.css').read_text()+'</style>')
    html=html.replace('<script src="../public/component-preview.js"></script>', '<script>'+(root/'public/component-preview.js').read_text()+'</script>')
    page.set_content(html)
    def check(name, fn):
        fn();results.append(name)
    def intent(s):
        page.evaluate('(s)=>setIntent(s)',s)
    registry=page.evaluate('Object.values(DLSComponentPreview.registry).map(r=>[r.type,r.aliases[0]])')
    for typ,alias in registry:
        for system in ['dls','ant','material','connected']:
            page.select_option('#system',system)
            intent('a '+alias)
            assert page.locator('#generated-preview [data-component]').count()==1,(typ,system)
            assert page.locator('#generated-preview [data-component]').get_attribute('data-component')==typ
            assert page.locator('.output-system-summary').inner_text().endswith('1 component')
            assert page.evaluate('generatedOutput(parseStructuredLanguage(state.editorText)).designSystem.components.length')==1
            results.append(f'{typ}/{system}: preview + count + JSON')
    page.select_option('#system','ant')
    intent('a checkbox labeled "Accept"')
    control=page.get_by_role('checkbox',name='Accept');control.focus();control.press('Space');assert control.is_checked();results.append('Checkbox Space interaction')
    intent('a switch labeled "Notifications"')
    control=page.get_by_role('switch',name='Notifications');control.focus();control.press('Space');assert control.is_checked();assert control.get_attribute('type')=='checkbox';results.append('Switch Space + semantic input')
    intent('a disabled button labeled "Save"');assert page.get_by_role('button',name='Save',exact=True).is_disabled();results.append('Disabled button')
    intent('a dropdown with options "Small", "Medium", "Large"');page.locator('#generated-preview select').select_option(label='Medium');assert page.locator('#generated-preview select').input_value()=='Medium';results.append('Dropdown selection')
    intent('a radio group with options "Yes", "No"');page.get_by_role('radio',name='No',exact=True).check();assert page.get_by_role('radio',name='No',exact=True).is_checked();assert not page.get_by_role('radio',name='Yes',exact=True).is_checked();results.append('Exclusive radios')
    intent('tabs with labels "Overview", "Settings"');page.get_by_role('tab',name='Overview').focus();page.keyboard.press('ArrowRight');assert page.get_by_role('tab',name='Settings').get_attribute('aria-selected')=='true';assert page.locator('[role=tabpanel]:visible').count()==1;results.append('Tabs keyboard and panel visibility')
    intent('an accordion labeled "Details" with content "More information"');page.locator('summary').focus();page.keyboard.press('Enter');assert page.locator('details').get_attribute('open') is not None;results.append('Accordion keyboard')
    intent('a slider min 0 max 100 value 40');slider=page.get_by_role('slider');slider.focus();slider.press('ArrowRight');assert slider.input_value()=='41';assert page.locator('output').inner_text()=='41';results.append('Slider keyboard + live value')
    intent('a tooltip labeled "Help" with content "Helpful text"');page.get_by_role('button',name='Help',exact=True).focus();assert page.locator('[role=tooltip]').evaluate('(e)=>getComputedStyle(e).opacity')=='1';results.append('Tooltip keyboard visibility')
    intent('a dismissible dialog labeled "Settings"');page.get_by_role('button',name='Close dialog preview').click();assert not page.get_by_role('dialog',name='Settings').is_visible();results.append('Inline dialog dismissal')
    intent('a card with an input labeled "Email" and a button labeled "Save"');assert page.locator('#generated-preview > .component-preview .cp-canvas > [data-component]').count()==1;assert page.locator('[data-component=Card] [data-component]').count()==2;assert '3 components' in page.locator('.output-system-summary').inner_text();results.append('Nested requested components + count')
    page.select_option('#mode','json');export=json.loads(page.locator('#json-code').inner_text());assert export['componentCount']==3;assert export['designSystem']['components']==['Card','Input','Button'];assert export['components'][0]['children'][0]['props']['label']=='Email';results.append('JSON mode actual tree + selected bindings')
    page.select_option('#mode','interface');page.click('#expand');assert page.locator('#preview-description').inner_text()=='3 components · Ant Design';ids=page.locator('[id]').evaluate_all('(es)=>es.map(e=>e.id)');assert len(ids)==len(set(ids));results.append('Expanded preview IDs + count')
    page.evaluate('document.getElementById("modal-root").innerHTML=""')
    page.fill('#given','a button');assert page.locator('#generated-preview [data-component]').count()==1;assert '1 component' in page.locator('.output-system-summary').inner_text();results.append('Typing updates scope + summary immediately')
    intent('a carousel');assert page.locator('#generated-preview [data-component]').count()==0;assert 'Not rendered' in page.locator('.cp-notice').inner_text();assert page.locator('#validation-state').inner_text()=='Needs input';results.append('Unsupported request explicit notice, no workflow')
    intent('a button labeled "<img src=x onerror=window.__injected=1>"');assert page.locator('#generated-preview img').count()==0;assert page.evaluate('window.__injected===undefined');results.append('HTML escaping in browser')
    page.evaluate('setIntent("an advertiser setting up a campaign","data is ready","create a campaign")');assert page.locator('.legacy-workflow').count()==1;results.append('Legacy workflow dispatch preserved')
    for theme in ['dark','light']:
      page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
      page.set_viewport_size({'width':390,'height':844})
      for typ,alias in registry:
        intent('a '+alias)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,typ,'horizontal overflow')
        results.append(f'{typ}/{theme}: narrow viewport')
    page.set_viewport_size({'width':1360,'height':860})
    page.evaluate('document.documentElement.dataset.theme="dark"')
    page.select_option('#system','ant')
    intent('an email input labeled "Email" with placeholder "name@example.com" and a button labeled "Continue"')
    page.screenshot(path=str(root/'browser-component-preview.png'),full_page=True)
    assert not errors,errors
    results.append('No browser JavaScript errors')
    browser.close()
(root/'test-browser.json').write_text(json.dumps({'passed':len(results),'failed':0,'checks':results},indent=2))
print(f'{len(results)} browser checks passed')
