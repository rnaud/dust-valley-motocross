#!/usr/bin/env python3
"""Read-only, version-locked inspection of the user's MCM executable.

No game files are copied. Stdlib only. Optional objdump output stays at the
explicitly requested path; the JSON contains measurements and evidence locations.
"""
import argparse
import configparser
import hashlib
import json
from pathlib import Path
import struct
import subprocess

EXPECTED = 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b'


class PE:
    def __init__(self, path):
        self.data = Path(path).read_bytes()
        self.sha256 = hashlib.sha256(self.data).hexdigest()
        if self.sha256 != EXPECTED:
            raise ValueError(f'Unrecognized executable {path}: {self.sha256}; addresses require re-analysis')
        p = struct.unpack_from('<I', self.data, 60)[0]
        assert self.data[p:p+4] == b'PE\0\0'
        count = struct.unpack_from('<H', self.data, p+6)[0]
        opt_size = struct.unpack_from('<H', self.data, p+20)[0]
        self.base = struct.unpack_from('<I', self.data, p+24+28)[0]
        self.sections = []
        for i in range(count):
            q = p+24+opt_size+i*40
            _, rva, size, offset = struct.unpack_from('<IIII', self.data, q+8)
            self.sections.append((self.base+rva, size, offset))

    def read(self, address, size=4):
        for va, length, offset in self.sections:
            if va <= address and address+size <= va+length:
                return self.data[offset+address-va:offset+address-va+size]
        raise ValueError(f'Unmapped address {address:x}')

    def immediate(self, address, expected_offset, kind='f'):
        # mov dword ptr [ebx/esi + disp32], imm32
        raw = self.read(address, 10)
        assert raw[:2] in (b'\xc7\x83', b'\xc7\x86'), raw.hex()
        assert struct.unpack_from('<I', raw, 2)[0] == expected_offset
        return {'instruction': hex(address), 'field_offset': hex(expected_offset),
                'value': struct.unpack_from('<'+kind, raw, 6)[0]}


def inspect(paths):
    images = [PE(p / 'mcm.exe') for p in paths]
    pe = images[0]
    fields = [
        ('step_seconds', 0x4a2104, 0x8cc, 'f'),
        ('max_iterations', 0x4a2114, 0x8d4, 'I'),
        ('max_speed_ft_s', 0x4a211e, 0x5ec, 'f'),
        ('traction_speed_ft_s', 0x4a2159, 0x6d4, 'f'),
        ('bike_weight_lb', 0x4a2163, 0x684, 'f'),
        ('rider_weight_lb', 0x4a216d, 0x688, 'f'),
        ('total_weight_lb', 0x4a2177, 0x68c, 'f'),
        ('mass_slugs', 0x4a21d2, 0x558, 'f'),
        ('front_spring_default', 0x4a222f, 0x5b8, 'f'),
        ('front_cubic_default', 0x4a2239, 0x5bc, 'f'),
        ('rear_spring_default', 0x4a2243, 0x5c8, 'f'),
        ('rear_cubic_default', 0x4a224d, 0x5cc, 'f'),
        ('front_damping_limit_ft_s', 0x4a22d6, 0x5c4, 'f'),
        ('rear_damping_limit_ft_s', 0x4a22e0, 0x5d4, 'f'),
        ('max_lean_rad', 0x4a2344, 0x83c, 'f'),
        ('max_lean_rate_rad_s', 0x4a234e, 0x840, 'f'),
        ('wreck_lean_rad', 0x4a2363, 0x858, 'f'),
        ('shift_seconds', 0x49eff8, 0x80, 'f'),
        ('indoor_outdoor_factor', 0x49f002, 0x1ec, 'f'),
        ('redline_rpm', 0x49f129, 0x140, 'f'),
    ]
    evidence = {name: pe.immediate(address, offset, kind)
                for name, address, offset, kind in fields}
    routines = {}
    for name, address, size, expected in [
        ('sqrt_table_setup', 0x401640, 114, 'e8f0d83b08f28112321b647bc0f5ceef688218efd35539d8b809f10825ff59fe'),
        ('sqrt_lookup', 0x4016c0, 94, '3014e0e56195a38634d8ea0e7bb5b9ab2ddb48ea4199e0418e59150c943740b7'),
        ('bike_scheduler', 0x4a54b6, 156, '16eff988029d87d982fcb832b6ccab47db5d852242bc3089547489e803289b2b'),
        ('truncate_to_integer', 0x4be978, 39, 'd0a2aca68648a0ae9d5cbfae1b276d4a64d4f797fc0c60f28b64096cdfa3148c'),
    ]:
        actual = hashlib.sha256(pe.read(address, size)).hexdigest()
        if actual != expected:
            raise ValueError(f'Routine bytes changed: {name}')
        routines[name] = {'address': hex(address), 'bytes': size, 'sha256': actual}
    configs = []
    for path in paths:
        raw = (path / 'sbike/bike2.bik').read_bytes()
        config = configparser.ConfigParser(interpolation=None, inline_comment_prefixes=(';',))
        config.optionxform = str
        config.read_string(raw.decode('cp1252'))
        configs.append({'sha256': hashlib.sha256(raw).hexdigest(), 'parsed': config})
    curves = {}
    # Each branch initializes stack arrays of RPM and HP. Decode the first
    # branch's immediate stores, rather than trusting the companion .bik file.
    for label, start, count in [('rpm', 0x49f1be, 12), ('hp', 0x49f230, 12)]:
        values = []
        address = start
        for _ in range(count):
            raw = pe.read(address, 10)
            assert raw[0] == 0xc7 and raw[1] in (0x45, 0x85)
            length = 7 if raw[1] == 0x45 else 10
            values.append(struct.unpack_from('<f', raw, length-4)[0])
            address += length
        curves[label] = values
    points = [[0, 0]] + list(map(list, zip(curves['rpm'], curves['hp'])))
    config_points = [[0, 0]] + [[int(k[3:]), float(v)] for k, v in configs[0]['parsed']['PowerCurve1'].items()
                               if k.startswith('Rpm') and k[3:].isdigit()]
    assert points == config_points, 'Compiled PowerCurve1 differs from companion config'
    return {
        'executables': [{'path': str(p/'mcm.exe'), 'sha256': image.sha256,
                         'bytes': len(image.data)} for p, image in zip(paths, images)],
        'same_executable': len({i.sha256 for i in images}) == 1,
        'same_config': len({c['sha256'] for c in configs}) == 1,
        'verified_initializers': evidence,
        'verified_routine_ranges': routines,
        'compiled_power_curve_1_rpm_hp': points,
        'torque_conversion_constant': struct.unpack('<f', pe.read(0x4d9718))[0],
        'peak_torque_rpm_curve_1': max(points[1:], key=lambda p: p[1]/p[0])[0],
        'scope': 'Static analysis; no original-game runtime measurements. Initializers are not proof of every downstream use.',
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directories', nargs='+', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--disassembly', type=Path)
    args = parser.parse_args()
    result = inspect(args.directories)
    if args.disassembly:
        with args.disassembly.open('w') as f:
            subprocess.run(['objdump', '-d', '--no-show-raw-insn', str(args.directories[0]/'mcm.exe')], stdout=f, check=True)
    text = json.dumps(result, indent=2)+'\n'
    if args.output:
        args.output.write_text(text)
    else:
        print(text, end='')
