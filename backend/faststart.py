import struct
import shutil
from pathlib import Path

def faststart(in_path: Path, out_path: Path):
    """
    Pure Python implementation of qt-faststart.
    Moves the 'moov' atom to the beginning of an MP4 file so that HTML5
    browsers can start playback immediately without downloading the whole file.
    """
    in_path = Path(in_path)
    out_path = Path(out_path)
    
    with open(in_path, 'rb') as f:
        # Read top-level atoms
        atoms = []
        while True:
            pos = f.tell()
            header = f.read(8)
            if not header or len(header) < 8:
                break
            size, atype = struct.unpack('>I4s', header)
            atype = atype.decode('latin1', errors='ignore')
            
            if size == 1:
                # 64-bit size
                ext_size = struct.unpack('>Q', f.read(8))[0]
                atoms.append((pos, atype, ext_size, 16))
                f.seek(pos + ext_size)
            elif size == 0:
                # To end of file
                f.seek(0, 2)
                end_pos = f.tell()
                atoms.append((pos, atype, end_pos - pos, 8))
                break
            else:
                atoms.append((pos, atype, size, 8))
                f.seek(pos + size)

        # Check if moov is already before mdat
        moov_idx = -1
        mdat_idx = -1
        for i, (_, atype, _, _) in enumerate(atoms):
            if atype == 'moov':
                moov_idx = i
            elif atype == 'mdat' and mdat_idx == -1:
                mdat_idx = i

        if moov_idx == -1:
            if in_path != out_path:
                shutil.copy2(in_path, out_path)
            return

        if mdat_idx == -1 or moov_idx < mdat_idx:
            # Already faststart / optimized
            if in_path != out_path:
                shutil.copy2(in_path, out_path)
            return

        moov_pos, _, moov_size, _ = atoms[moov_idx]
        
        # Read moov atom data
        f.seek(moov_pos)
        moov_data = bytearray(f.read(moov_size))

    # Calculate offset shift (size of moov atom)
    offset_shift = moov_size

    # Patch 'stco' (32-bit chunk offset) and 'co64' (64-bit chunk offset) inside moov
    def patch_offsets(data: bytearray, shift: int):
        idx = 0
        while idx < len(data) - 8:
            atom_size, atom_type = struct.unpack('>I4s', data[idx:idx+8])
            atom_type = atom_type.decode('latin1', errors='ignore')
            if atom_size == 0 or atom_size > len(data) - idx:
                break
            
            if atom_type == 'stco':
                # Version (1) + Flags (3) + Entry count (4)
                entry_count = struct.unpack('>I', data[idx+12:idx+16])[0]
                offset_idx = idx + 16
                for _ in range(entry_count):
                    old_offset = struct.unpack('>I', data[offset_idx:offset_idx+4])[0]
                    new_offset = old_offset + shift
                    struct.pack_into('>I', data, offset_idx, new_offset)
                    offset_idx += 4
            elif atom_type == 'co64':
                entry_count = struct.unpack('>I', data[idx+12:idx+16])[0]
                offset_idx = idx + 16
                for _ in range(entry_count):
                    old_offset = struct.unpack('>Q', data[offset_idx:offset_idx+8])[0]
                    new_offset = old_offset + shift
                    struct.pack_into('>Q', data, offset_idx, new_offset)
                    offset_idx += 8
            elif atom_type in ('trak', 'mdia', 'minf', 'stbl'):
                patch_offsets(data[idx+8:idx+atom_size], shift)

            idx += atom_size

    patch_offsets(moov_data, offset_shift)

    # Write new file: header atoms before mdat, then moov, then mdat, then remainder
    with open(out_path, 'wb') as out_f, open(in_path, 'rb') as in_f:
        # 1. Atoms before mdat
        for pos, atype, size, _ in atoms[:mdat_idx]:
            in_f.seek(pos)
            shutil.copyfileobj(in_f, out_f, size)

        # 2. Optimized moov atom
        out_f.write(moov_data)

        # 3. mdat and everything else except original moov
        for i, (pos, atype, size, _) in enumerate(atoms[mdat_idx:]):
            if i + mdat_idx == moov_idx:
                continue
            in_f.seek(pos)
            chunk_remaining = size
            while chunk_remaining > 0:
                chunk = in_f.read(min(chunk_remaining, 1024 * 1024))
                if not chunk:
                    break
                out_f.write(chunk)
                chunk_remaining -= len(chunk)
