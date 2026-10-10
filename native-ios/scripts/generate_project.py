#!/usr/bin/env python3
"""Generate the isolated Xcode project deterministically. No package install or signing."""
from pathlib import Path
import hashlib
import json
import plistlib
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
project = root / 'DLSMagician.xcodeproj'
project.mkdir(exist_ok=True)
objects = []
def uid(name): return hashlib.sha1(name.encode()).hexdigest()[:24].upper()
def quote(value): return json.dumps(str(value))
def add(name, body):
    objects.append(f'\t\t{uid(name)} = {{ {body} }};')
    return uid(name)
def refs(names): return '(' + ', '.join(uid(name) for name in names) + ', )' if names else '()'

app_files = sorted((root / 'DLSMagician').glob('*.swift'))
test_files = sorted((root / 'DLSMagicianTests').glob('*.swift'))
ui_test_files = sorted((root / 'DLSMagicianUITests').glob('*.swift'))
for f in app_files + test_files + ui_test_files:
    name = str(f.relative_to(root))
    add(name, f'isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {quote(name)}; sourceTree = SOURCE_ROOT;')
    add('build:' + name, f'isa = PBXBuildFile; fileRef = {uid(name)};')
for name, kind in [('DLSMagician/Assets.xcassets', 'folder.assetcatalog'), ('DLSMagician/Info.plist', 'text.plist.xml')]:
    add(name, f'isa = PBXFileReference; lastKnownFileType = {kind}; path = {quote(name)}; sourceTree = SOURCE_ROOT;')
add('build:assets', f'isa = PBXBuildFile; fileRef = {uid("DLSMagician/Assets.xcassets")};')
add('app-product', 'isa = PBXFileReference; explicitFileType = wrapper.application; path = DLSMagician.app; sourceTree = BUILT_PRODUCTS_DIR;')
add('test-product', 'isa = PBXFileReference; explicitFileType = wrapper.cfbundle; path = DLSMagicianTests.xctest; sourceTree = BUILT_PRODUCTS_DIR;')
add('ui-product', 'isa = PBXFileReference; explicitFileType = wrapper.cfbundle; path = DLSMagicianUITests.xctest; sourceTree = BUILT_PRODUCTS_DIR;')
add('ui-group', f'isa = PBXGroup; name = DLSMagicianUITests; children = {refs([str(f.relative_to(root)) for f in ui_test_files])}; sourceTree = "<group>";')
add('app-group', f'isa = PBXGroup; name = DLSMagician; children = {refs([str(f.relative_to(root)) for f in app_files] + ["DLSMagician/Assets.xcassets", "DLSMagician/Info.plist"])}; sourceTree = "<group>";')
add('test-group', f'isa = PBXGroup; name = DLSMagicianTests; children = {refs([str(f.relative_to(root)) for f in test_files])}; sourceTree = "<group>";')
add('products', f'isa = PBXGroup; name = Products; children = {refs(["app-product", "test-product", "ui-product"])}; sourceTree = "<group>";')
add('main-group', f'isa = PBXGroup; children = {refs(["app-group", "test-group", "ui-group", "products"])}; sourceTree = "<group>";')
add('supabase-package', 'isa = XCRemoteSwiftPackageReference; repositoryURL = "https://github.com/supabase/supabase-swift.git"; requirement = { kind = exactVersion; version = 2.55.3; };')
add('auth-product', f'isa = XCSwiftPackageProductDependency; package = {uid("supabase-package")}; productName = Auth;')
add('build:auth', f'isa = PBXBuildFile; productRef = {uid("auth-product")};')
for target, files in [('app', app_files), ('test', test_files), ('ui', ui_test_files)]:
    add(target + '-sources', f'isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = {refs(["build:" + str(f.relative_to(root)) for f in files])}; runOnlyForDeploymentPostprocessing = 0;')
    add(target + '-frameworks', f'isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = {refs(["build:auth"] if target == "app" else [])}; runOnlyForDeploymentPostprocessing = 0;')
    add(target + '-resources', f'isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = {refs(["build:assets"] if target == "app" else [])}; runOnlyForDeploymentPostprocessing = 0;')
add('test-proxy', f'isa = PBXContainerItemProxy; containerPortal = {uid("project")}; proxyType = 1; remoteGlobalIDString = {uid("app-target")}; remoteInfo = DLSMagician;')
add('test-dependency', f'isa = PBXTargetDependency; target = {uid("app-target")}; targetProxy = {uid("test-proxy")};')
add('app-target', f'isa = PBXNativeTarget; buildConfigurationList = {uid("app-config-list")}; buildPhases = {refs(["app-sources", "app-frameworks", "app-resources"])}; buildRules = (); dependencies = (); name = DLSMagician; packageProductDependencies = {refs(["auth-product"])}; productName = DLSMagician; productReference = {uid("app-product")}; productType = "com.apple.product-type.application";')
add('test-target', f'isa = PBXNativeTarget; buildConfigurationList = {uid("test-config-list")}; buildPhases = {refs(["test-sources", "test-frameworks", "test-resources"])}; buildRules = (); dependencies = {refs(["test-dependency"])}; name = DLSMagicianTests; productName = DLSMagicianTests; productReference = {uid("test-product")}; productType = "com.apple.product-type.bundle.unit-test";')
add('ui-target', f'isa = PBXNativeTarget; buildConfigurationList = {uid("ui-config-list")}; buildPhases = {refs(["ui-sources", "ui-frameworks", "ui-resources"])}; buildRules = (); dependencies = {refs(["test-dependency"])}; name = DLSMagicianUITests; productName = DLSMagicianUITests; productReference = {uid("ui-product")}; productType = "com.apple.product-type.bundle.ui-testing";')
common = 'CLANG_ENABLE_MODULES = YES; IPHONEOS_DEPLOYMENT_TARGET = 16.0; SDKROOT = iphoneos; SWIFT_VERSION = 5.0; TARGETED_DEVICE_FAMILY = "1,2";'
for name in ['Debug', 'Release']:
    add('project-' + name, f'isa = XCBuildConfiguration; name = {name}; buildSettings = {{ {common} CLANG_ENABLE_OBJC_ARC = YES; SWIFT_OPTIMIZATION_LEVEL = {quote("-Onone" if name == "Debug" else "-O")}; ENABLE_TESTABILITY = {"YES" if name == "Debug" else "NO"}; }};')
    app = 'ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon; CODE_SIGN_STYLE = Automatic; DEVELOPMENT_TEAM = CRFM39M63R; CURRENT_PROJECT_VERSION = 1; MARKETING_VERSION = 1.0; PRODUCT_BUNDLE_IDENTIFIER = design.zhenli.dlsmagician; PRODUCT_NAME = "$(TARGET_NAME)"; INFOPLIST_FILE = DLSMagician/Info.plist; GENERATE_INFOPLIST_FILE = NO; SWIFT_EMIT_LOC_STRINGS = YES;'
    add('app-' + name, f'isa = XCBuildConfiguration; name = {name}; buildSettings = {{ {common} {app} }};')
    test = 'GENERATE_INFOPLIST_FILE = YES; PRODUCT_BUNDLE_IDENTIFIER = design.zhenli.dlsmagician.tests; PRODUCT_NAME = "$(TARGET_NAME)"; BUNDLE_LOADER = "$(TEST_HOST)"; TEST_HOST = "$(BUILT_PRODUCTS_DIR)/DLSMagician.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/DLSMagician";'
    add('test-' + name, f'isa = XCBuildConfiguration; name = {name}; buildSettings = {{ {common} {test} }};')
    ui = 'GENERATE_INFOPLIST_FILE = YES; PRODUCT_BUNDLE_IDENTIFIER = design.zhenli.dlsmagician.uitests; PRODUCT_NAME = "$(TARGET_NAME)"; TEST_TARGET_NAME = DLSMagician; CODE_SIGN_STYLE = Automatic;'
    add('ui-' + name, f'isa = XCBuildConfiguration; name = {name}; buildSettings = {{ {common} {ui} }};')
for target in ['app', 'test', 'ui', 'project']:
    add(target + '-config-list', f'isa = XCConfigurationList; buildConfigurations = {refs([target + "-Debug", target + "-Release"])}; defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
add('project', f'isa = PBXProject; attributes = {{ LastUpgradeCheck = 1640; TargetAttributes = {{ {uid("app-target")} = {{ CreatedOnToolsVersion = 16.4; }}; {uid("test-target")} = {{ CreatedOnToolsVersion = 16.4; TestTargetID = {uid("app-target")}; }}; }}; }}; buildConfigurationList = {uid("project-config-list")}; compatibilityVersion = "Xcode 15.0"; developmentRegion = en; hasScannedForEncodings = 0; knownRegions = (en, Base); mainGroup = {uid("main-group")}; productRefGroup = {uid("products")}; packageReferences = {refs(["supabase-package"])}; projectDirPath = ""; projectRoot = ""; targets = {refs(["app-target", "test-target", "ui-target"])};')
(project / 'project.pbxproj').write_text('// !$*UTF8*$!\n{\n archiveVersion = 1;\n classes = {};\n objectVersion = 60;\n objects = {\n' + '\n'.join(objects) + f'\n }};\n rootObject = {uid("project")};\n}}\n')
scheme = ET.Element('Scheme', {'LastUpgradeVersion': '1640', 'version': '1.7'})
build = ET.SubElement(scheme, 'BuildAction', {'parallelizeBuildables':'YES', 'buildImplicitDependencies':'YES'})
entry = ET.SubElement(ET.SubElement(build, 'BuildActionEntries'), 'BuildActionEntry', {k:'YES' for k in ['buildForTesting','buildForRunning','buildForProfiling','buildForArchiving','buildForAnalyzing']})
def reference(parent, test=False, ui=False):
    target, product = ('ui-target', 'DLSMagicianUITests') if ui else ('test-target', 'DLSMagicianTests') if test else ('app-target', 'DLSMagician')
    ET.SubElement(parent, 'BuildableReference', {'BuildableIdentifier':'primary','BlueprintIdentifier':uid(target), 'BuildableName':product + ('.app' if not test and not ui else '.xctest'), 'BlueprintName':product, 'ReferencedContainer':'container:DLSMagician.xcodeproj'})
reference(entry)
test = ET.SubElement(scheme, 'TestAction', {'buildConfiguration':'Debug','selectedDebuggerIdentifier':'Xcode.DebuggerFoundation.Debugger.LLDB','selectedLauncherIdentifier':'Xcode.IDEFoundation.Launcher.LLDB','shouldUseLaunchSchemeArgsEnv':'YES'})
testables = ET.SubElement(test, 'Testables')
reference(ET.SubElement(testables, 'TestableReference', {'skipped':'NO'}), True)
reference(ET.SubElement(testables, 'TestableReference', {'skipped':'NO'}), ui=True)
launch = ET.SubElement(scheme, 'LaunchAction', {'buildConfiguration':'Debug','selectedDebuggerIdentifier':'Xcode.DebuggerFoundation.Debugger.LLDB','selectedLauncherIdentifier':'Xcode.IDEFoundation.Launcher.LLDB','launchStyle':'0','useCustomWorkingDirectory':'NO','ignoresPersistentStateOnLaunch':'NO','debugDocumentVersioning':'YES','allowLocationSimulation':'YES'})
reference(ET.SubElement(launch, 'BuildableProductRunnable', {'runnableDebuggingMode':'0'}))
ET.SubElement(scheme, 'AnalyzeAction', {'buildConfiguration':'Debug'})
ET.SubElement(scheme, 'ArchiveAction', {'buildConfiguration':'Release','revealArchiveInOrganizer':'YES'})
schemes=project/'xcshareddata/xcschemes'; schemes.mkdir(parents=True,exist_ok=True)
ET.indent(scheme)
ET.ElementTree(scheme).write(schemes/'DLSMagician.xcscheme',encoding='utf-8',xml_declaration=True)
workspace=project/'project.xcworkspace';workspace.mkdir(exist_ok=True)
(workspace/'contents.xcworkspacedata').write_text('<?xml version="1.0" encoding="UTF-8"?><Workspace version="1.0"><FileRef location="self:"></FileRef></Workspace>\n')
info = {'CFBundleDevelopmentRegion':'en','CFBundleDisplayName':'DLS Magician','CFBundleExecutable':'$(EXECUTABLE_NAME)','CFBundleIdentifier':'$(PRODUCT_BUNDLE_IDENTIFIER)','CFBundleInfoDictionaryVersion':'6.0','CFBundleName':'$(PRODUCT_NAME)','CFBundlePackageType':'APPL','CFBundleShortVersionString':'$(MARKETING_VERSION)','CFBundleVersion':'$(CURRENT_PROJECT_VERSION)','LSRequiresIPhoneOS':True,'UILaunchScreen':{},'UIApplicationSceneManifest':{'UIApplicationSupportsMultipleScenes':False},'UISupportedInterfaceOrientations':['UIInterfaceOrientationPortrait','UIInterfaceOrientationLandscapeLeft','UIInterfaceOrientationLandscapeRight'],'CFBundleURLTypes':[{'CFBundleURLName':'design.zhenli.dlsmagician.auth','CFBundleURLSchemes':['design.zhenli.dlsmagician']} ]}
(root/'DLSMagician/Info.plist').write_bytes(plistlib.dumps(info,sort_keys=False))
assets=root/'DLSMagician/Assets.xcassets'
(assets/'Contents.json').write_text(json.dumps({'info':{'author':'xcode','version':1}},indent=2)+'\n')
(assets/'AccentColor.colorset').mkdir(exist_ok=True)
def color(r,g,b): return {'color-space':'srgb','components':{'alpha':'1.000','red':str(r/255),'green':str(g/255),'blue':str(b/255)}}
tokens=json.loads((root/'DesignSystem/tokens.json').read_text())
def token_color(mode):
    value=tokens['color'][mode]['gold'].lstrip('#')
    return color(*[int(value[i:i+2],16) for i in (0,2,4)])
(assets/'AccentColor.colorset/Contents.json').write_text(json.dumps({'colors':[{'idiom':'universal','color':token_color('light')},{'idiom':'universal','appearances':[{'appearance':'luminosity','value':'dark'}],'color':token_color('dark')}],'info':{'author':'xcode','version':1}},indent=2)+'\n')
(assets/'BrandMark.imageset/Contents.json').write_text(json.dumps({'images':[{'filename':'DLSMark.png','idiom':'universal'}],'info':{'author':'xcode','version':1}},indent=2)+'\n')
(assets/'AppIcon.appiconset/Contents.json').write_text(json.dumps({'images':[{'filename':'DLSMark.png','idiom':'universal','platform':'ios','size':'1024x1024'}],'info':{'author':'xcode','version':1}},indent=2)+'\n')
print(f'Generated {project} with {len(app_files)} app source files and {len(test_files)} unit-test / {len(ui_test_files)} UI-test source files.')
