#!/usr/bin/env python3
"""Honest source/project validation, not a substitute for Swift compilation."""
import hashlib
import json
from pathlib import Path
import plistlib
import re
import struct
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

class ProjectChecks(unittest.TestCase):
    def test_every_swift_file_is_in_sources_build_phase(self):
        project = (ROOT/'DLSMagician.xcodeproj/project.pbxproj').read_text()
        for directory in ['DLSMagician','DLSMagicianTests','DLSMagicianUITests']:
            for file in (ROOT/directory).glob('*.swift'):
                relative = str(file.relative_to(ROOT))
                file_id = hashlib.sha1(relative.encode()).hexdigest()[:24].upper()
                build_id = hashlib.sha1(('build:'+relative).encode()).hexdigest()[:24].upper()
                self.assertIn(f'fileRef = {file_id};',project)
                self.assertEqual(project.count(build_id),2,relative)
                self.assertIn(f'path = "{relative}";',project)
    def test_xcode_object_references_resolve_and_ids_are_unique(self):
        project=(ROOT/'DLSMagician.xcodeproj/project.pbxproj').read_text()
        definitions=re.findall(r'^\s*([A-F0-9]{24}) = \{',project,re.M)
        self.assertEqual(len(definitions),len(set(definitions)))
        for reference in re.findall(r'\b[A-F0-9]{24}\b',project): self.assertIn(reference,definitions)
    def test_native_target_scheme_and_registered_callback(self):
        info=plistlib.loads((ROOT/'DLSMagician/Info.plist').read_bytes())
        self.assertEqual(info['CFBundleURLTypes'][0]['CFBundleURLSchemes'],['design.zhenli.dlsmagician'])
        self.assertNotIn('NSAppTransportSecurity',info)
        scheme=ET.parse(ROOT/'DLSMagician.xcodeproj/xcshareddata/xcschemes/DLSMagician.xcscheme')
        self.assertEqual(len(scheme.findall('.//TestableReference')),2)
        project=(ROOT/'DLSMagician.xcodeproj/project.pbxproj').read_text()
        self.assertIn('PRODUCT_BUNDLE_IDENTIFIER = design.zhenli.dlsmagician;',project)
        self.assertIn('IPHONEOS_DEPLOYMENT_TARGET = 16.0;',project)
        self.assertIn('kind = exactVersion; version = 2.55.3;',project)
        self.assertNotIn('Capacitor',project)
        source='\n'.join(p.read_text() for p in (ROOT/'DLSMagician').glob('*.swift'))
        self.assertNotIn('WKWebView',source)
        self.assertNotIn('.topBar',source)
    def test_approved_brand_asset_is_exact_original(self):
        original=ROOT.parent/'base-tree.json'
        tree=json.loads(original.read_text())['tree']
        expected=next(f['sha'] for f in tree if f['path']=='mobile/assets/ios/dls-app-icon-1024.png')
        for folder in ['BrandMark.imageset','AppIcon.appiconset']:
            file=ROOT/f'DLSMagician/Assets.xcassets/{folder}/DLSMark.png'
            data=file.read_bytes()
            actual=hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()
            self.assertEqual(actual,expected)
            self.assertEqual(data[:8], b'\x89PNG\r\n\x1a\n')
            self.assertEqual(struct.unpack('>II', data[16:24]),(1024,1024))
    def test_production_source_snapshot_has_verified_git_blob_hashes(self):
        tree=json.loads((ROOT.parent/'production-tree.json').read_text())['tree']
        verified=0
        for entry in tree:
            file=ROOT.parent/'production'/entry['path']
            if entry['type']!='blob' or not file.is_file(): continue
            data=file.read_bytes()
            self.assertEqual(hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest(),entry['sha'],entry['path'])
            verified+=1
        self.assertGreaterEqual(verified,20)

if __name__ == '__main__': unittest.main(verbosity=2)
