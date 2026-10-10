#!/usr/bin/env python3
"""Generate the SwiftUI adapter from the shared web-derived canonical tokens."""
from pathlib import Path
import argparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'DesignSystem/tokens.json'
DESTINATION = ROOT / 'DLSMagician/DLSTheme.swift'

def rgba(value):
    if value.startswith('#'):
        value = value[1:]
        if len(value) != 6: raise ValueError('Expected six-digit web color')
        return [int(value[i:i+2],16) for i in (0,2,4)] + [1.0]
    match = re.fullmatch(r'rgba\((\d+),(\d+),(\d+),([\d.]+)\)', value)
    if not match: raise ValueError('Unrecognized canonical color: ' + value)
    return [int(match[i]) for i in (1,2,3)] + [float(match[4])]

def swift_color(value):
    if value == 'transparent': return 'Color.clear'
    return 'Color(uiColor: ' + ui_color(value) + ')'

def gradient_layer(layer):
    kind = layer['type']
    if kind == 'solid': return '.solid(' + swift_color(layer['color']) + ')'
    stops = ', '.join('.init(color: ' + swift_color(stop['color']) + ', location: ' + str(stop['position']) + ')' for stop in layer['stops'])
    if kind == 'linear': return f'.linear(degrees: {layer["angleDegrees"]}, stops: [{stops}])'
    if kind == 'radial': return f'.radial(center: UnitPoint(x: {layer["center"][0]}, y: {layer["center"][1]}), stops: [{stops}])'
    raise ValueError('Unrecognized canonical gradient: ' + kind)

def ui_color(value):
    r,g,b,a=rgba(value)
    return f'UIColor(red: {r}.0 / 255, green: {g}.0 / 255, blue: {b}.0 / 255, alpha: {a:g})'


def gradient_definitions(tokens):
    gradients=tokens['gradients']
    roles=gradients['roles']
    lines=['    // CSS background arrays are top layer first; DLSGradientSurface reverses painting order.',
           '    enum GradientRole: CaseIterable { case ' + ', '.join(roles) + ' }',
           '    static func gradientLayers(_ role: GradientRole, scheme: ColorScheme, width: CGFloat) -> [DLSGradientLayer] {',
           '        switch role {']
    for role, modes in roles.items():
        lines.append(f'        case .{role}:')
        if role == 'authBackground' and 'authBackgroundMobile' in roles:
            lines.append('            // Source @media (max-width: 760px); later light-theme override is retained.')
            lines.append('            if width <= 760 { return gradientLayers(.authBackgroundMobile, scheme: scheme, width: width) }')
        lines.append('            if scheme == .dark {')
        lines.append('                return [' + ', '.join(gradient_layer(layer) for layer in modes['dark']) + ']')
        lines.append('            }')
        lines.append('            return [' + ', '.join(gradient_layer(layer) for layer in modes['light']) + ']')
    lines += ['        }','    }']
    glow=gradients['projectGlow']
    for name,key in {'projectGlowSize':'size','projectGlowRight':'right','projectGlowTop':'top','projectGlowBlur':'blur','projectGlowOpacity':'opacity'}.items():
        lines.append(f'    static let {name}: CGFloat = {glow[key]}')
    lines += ['    static func projectGlow(_ accent: String?) -> Color {','        switch accent {']
    for name in glow['darkColors']:
        label='default' if name == 'violet' else 'case "'+name+'"'
        if name == 'violet': continue
        lines += [f'        {label}:', '            return Color(uiColor: UIColor { traits in',
                  '                traits.userInterfaceStyle == .dark ? ' + ui_color(glow['darkColors'][name]) + ' : ' + ui_color(glow['lightColors'][name]),'            })']
    lines += ['        default:', '            return Color(uiColor: UIColor { traits in',
              '                traits.userInterfaceStyle == .dark ? ' + ui_color(glow['darkColors']['violet']) + ' : ' + ui_color(glow['lightColors']['violet']),'            })','        }','    }']
    lines += ['    // Library palette only; no invented people or avatars are inserted into project cards.',
              '    static func avatarLayers(_ accent: String, scheme: ColorScheme) -> [DLSGradientLayer] {', '        switch accent {']
    avatars=gradients.get('avatars', {})
    for name, avatar in avatars.items():
        if name == 'violet': continue
        lines.append('        case "' + name + '":')
        for mode in ['dark','light']:
            layer={'type':'linear','angleDegrees':avatar['angleDegrees'],'stops':[{'color':color,'position':i/(len(avatar[mode])-1)} for i,color in enumerate(avatar[mode])]}
            prefix='            if scheme == .dark { return [' if mode == 'dark' else '            return ['
            lines.append(prefix+gradient_layer(layer)+('] }' if mode == 'dark' else ']'))
    lines.append('        default:')
    avatar=avatars['violet']
    for mode in ['dark','light']:
        layer={'type':'linear','angleDegrees':avatar['angleDegrees'],'stops':[{'color':color,'position':i/(len(avatar[mode])-1)} for i,color in enumerate(avatar[mode])]}
        prefix='            if scheme == .dark { return [' if mode == 'dark' else '            return ['
        lines.append(prefix+gradient_layer(layer)+('] }' if mode == 'dark' else ']'))
    lines += ['        }', '    }']
    return lines


def account_definitions(tokens):
    account=tokens['componentPatterns']['account']
    lines=[f'    static let accountTitle = Font.custom("Georgia", size: {account["title"]["size"]}, relativeTo: .title2)',
           '    static let accountAvatarBorder = Color(uiColor: UIColor { traits in',
           '        traits.userInterfaceStyle == .dark ? ' + ui_color(account['avatarBorder']['dark']) + ' : ' + ui_color(account['avatarBorder']['light']),
           '    })',
           '    static func accountAvatarInk(_ accent: String?) -> Color {',
           '        let light: UIColor', '        switch accent {']
    for accent, value in account['avatarInk']['light'].items():
        if accent == 'violet': continue
        lines.append(f'        case "{accent}": light = ' + ui_color(value))
    lines += ['        default: light = ' + ui_color(account['avatarInk']['light']['violet']),
              '        }', '        return Color(uiColor: UIColor { traits in',
              '            traits.userInterfaceStyle == .dark ? ' + ui_color(account['avatarInk']['dark']) + ' : light',
              '        })', '    }']
    return lines

def render():
    source = SOURCE.read_bytes()
    tokens = json.loads(source)
    lines = [
        '// Generated by scripts/generate_theme.py. Edit DesignSystem/tokens.json, then regenerate.',
        '// Canonical token SHA-256: ' + hashlib.sha256(source).hexdigest(),
        '// Source CSS SHA-256: ' + tokens['source']['sha256'],
        'import SwiftUI', 'import UIKit', '', 'enum DLSTheme {'
    ]
    aliases = {'background':'background','surface':'surface','surface2':'surface2','surface3':'surface3',
               'text':'text','soft':'textSoft','muted':'muted','border':'line','strongBorder':'lineStrong',
               'gold':'gold','primaryFill':'primaryFill','primaryInk':'primaryInk',
               'violet':'violet','green':'green','blue':'blue','amber':'amber','pink':'pink','cyan':'cyan','danger':'danger'}
    for name,key in aliases.items():
        dark=tokens['color']['dark'][key]; light=tokens['color']['light'][key]
        lines += [f'    // {key}: dark {dark}; light {light}',f'    static let {name} = Color(uiColor: UIColor {{ traits in',
                  f'        traits.userInterfaceStyle == .dark ? {ui_color(dark)} : {ui_color(light)}','    })']
    outline=tokens['nativeAccessibility']['editableOutline']
    lines += ['    // Explicit native input visibility adaptation; decorative borders retain web alpha.',
              '    static let editableOutline = Color(uiColor: UIColor { traits in',
              f'        traits.userInterfaceStyle == .dark ? {ui_color(outline["dark"])} : {ui_color(outline["light"])}','    })']
    lines += gradient_definitions(tokens)
    lines += account_definitions(tokens)
    lines.append(f'    static let authTitle = Font.custom("Georgia", size: {tokens["typography"]["web"]["authTitle"]}, relativeTo: .largeTitle)')
    for name,key in {'radiusButton':'genericButton','radiusControl':'provider','radiusCard':'projectCard',
                     'radiusAuthCard':'authCard','radiusMobileCard':'authCardMobile','radiusPanel':'panel'}.items():
        lines.append(f'    static let {name}: CGFloat = {tokens["radius"][key]}')
    lines += [
        '    static func projectAccent(_ name: String?) -> Color {',
        '        switch name {',
        '        case "green": return green', '        case "blue": return blue',
        '        case "amber": return amber', '        case "pink": return pink',
        '        case "cyan": return cyan', '        default: return violet',
        '        }', '    }', '}', ''
    ]
    return '\n'.join(lines)

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    result=render()
    if args.check:
        if not DESTINATION.exists() or DESTINATION.read_text()!=result: raise SystemExit('DLSTheme.swift does not match canonical tokens; regenerate it.')
        print('SwiftUI adapter matches canonical tokens byte for byte.')
    else:
        DESTINATION.write_text(result)
        print('Generated ' + str(DESTINATION))
