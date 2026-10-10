#!/usr/bin/env python3
"""Checks source fidelity and behavior preservation, not native rendering or compilation."""
from pathlib import Path
import hashlib
import json
import re
import sys
import unittest

sys.dont_write_bytecode = True
import generate_theme

ROOT = Path(__file__).resolve().parents[1]
TOKENS = json.loads((ROOT / 'DesignSystem/tokens.json').read_text())
SOURCE = ROOT / 'DLSMagician'


class ThemeChecks(unittest.TestCase):
    def test_generated_adapter_preserves_canonical_layers(self):
        self.assertEqual((SOURCE / 'DLSTheme.swift').read_text(), generate_theme.render())
        roles = TOKENS['gradients']['roles']
        self.assertEqual(roles['authBackgroundMobile']['light'], roles['authBackground']['light'])
        mobile = roles['authBackgroundMobile']['dark']
        self.assertEqual(mobile[0]['center'], [0.5, 0.02])
        self.assertEqual(mobile[0]['stops'][1]['position'], 0.35)
        self.assertEqual(mobile[1], {'type': 'solid', 'color': '#08080a'})
        self.assertEqual(roles['authCard']['light'][0]['type'], 'solid')
        self.assertEqual(roles['projectCard']['light'][0]['type'], 'solid')

    def test_gradients_and_glow_have_verified_web_source_values(self):
        css = (ROOT.parent / 'production/public/styles.css').read_bytes()
        self.assertEqual(hashlib.sha256(css).hexdigest(), TOKENS['source']['sha256'])
        normalized = re.sub(r'\s+', '', css.decode())
        for role in TOKENS['gradients']['roles'].values():
            for layers in role.values():
                for layer in layers:
                    if layer['type'] == 'solid':
                        self.assertIn(layer['color'], normalized)
                    else:
                        for stop in layer['stops']:
                            self.assertIn(stop['color'], normalized)
                        if layer['type'] == 'linear':
                            self.assertIn(f'linear-gradient({layer["angleDegrees"]}deg,', normalized)
        for mode in ['darkColors', 'lightColors']:
            for color in TOKENS['gradients']['projectGlow'][mode].values():
                self.assertIn(color, normalized)
        for avatar in TOKENS['gradients']['avatars'].values():
            for mode in ['dark', 'light']:
                self.assertIn(f'linear-gradient({avatar["angleDegrees"]}deg,' + ','.join(avatar[mode]) + ')', normalized)
        account = TOKENS['componentPatterns']['account']
        for color in [account['avatarInk']['dark'], *account['avatarInk']['light'].values(), *account['avatarBorder'].values()]:
            self.assertIn(color, normalized)
        title_rule = re.search(r'\.modal-title\s*\{([^}]+)', css.decode()).group(1)
        self.assertIn(f'font-size: {account["title"]["size"]}px', title_rule)

    def test_gradient_surfaces_are_connected_to_real_views(self):
        login = (SOURCE / 'LoginView.swift').read_text()
        workspace = (SOURCE / 'WorkspaceView.swift').read_text()
        components = (SOURCE / 'DLSComponents.swift').read_text()
        self.assertIn('DLSGradientSurface(role: .authBackground)', login)
        self.assertIn('DLSGradientSurface(role: .authCard)', login)
        self.assertIn('DLSGradientSurface(role: .projectCard)', workspace)
        self.assertIn('DLSTheme.projectGlow(project.accent)', workspace)
        self.assertIn('layers.reversed()', components)
        self.assertIn('farthestCornerRadius(size: size, center: center)', components)
        self.assertIn('DLSTheme.primaryFill', components)
        self.assertIn('DLSAccountAvatar(initials: user.initials, accent: user.color)', workspace)
        self.assertIn('Task { await app.signOut(); dismiss() }', workspace)
        self.assertIn('Text("Account").font(DLSTheme.accountTitle)', workspace)

    def test_reviewed_behavior_source_hashes(self):
        preservation = json.loads((ROOT / 'DesignSystem/style-preservation.json').read_text())
        for name, evidence in preservation['protectedSources'].items():
            data = (SOURCE / name).read_bytes()
            if name == 'Models.swift':
                data = data.replace(b'    let accent: String?\n', b'').replace(b'    let color: String?\n', b'')
            self.assertEqual(hashlib.sha256(data).hexdigest(), evidence.get('reviewedFeatureSha256', evidence['baselineSha256']), name)


if __name__ == '__main__':
    unittest.main(verbosity=2)
