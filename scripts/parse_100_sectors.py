#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Parse MESAJIFY_100_SEKTOR_1000_DETAYLI_VEO_REKLAM_PROMPTU.txt
and produce a structured sector_prompt_bank.json and helper modules.
"""

import re
import json
import os
import sys

def main():
    input_path = 'MESAJIFY_100_SEKTOR_1000_DETAYLI_VEO_REKLAM_PROMPTU.txt'
    output_json = 'services/omnistudio/gateway/sector_prompt_bank.json'
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        sys.exit(1)
        
    print(f"Reading {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into sectors by "SEKTÖR S"
    sector_blocks = re.split(r'\n(?=SEKTÖR S\d{3}:)', content)
    # The first block is table of contents and intro rules
    intro_block = sector_blocks[0]
    sector_blocks = sector_blocks[1:]
    
    print(f"Found {len(sector_blocks)} sector blocks.")
    
    sectors = {}
    
    for block in sector_blocks:
        lines = block.strip().split('\n')
        header = lines[0] # e.g. SEKTÖR S077: İNŞAAT VE YAPI MALZEMELERI
        m_id = re.search(r'SEKTÖR (S\d{3}):\s*(.*)', header, re.IGNORECASE)
        if not m_id:
            continue
        sector_id = m_id.group(1).upper()
        sector_name = m_id.group(2).strip()
        
        # Metadata extraction
        ana_konu = ""
        m = re.search(r'ANA KONU:\s*([^\n]+)', block)
        if m: ana_konu = m.group(1).strip()
        
        ortam = ""
        m = re.search(r'ONAYLANACAK ORTAM:\s*([^\n]+)', block)
        if m: ortam = m.group(1).strip()
        
        roller = ""
        m = re.search(r'İNSAN ROLLERİ:\s*([^\n]+)', block)
        if m: roller = m.group(1).strip()
        
        malzeme = ""
        m = re.search(r'GÖRSEL MALZEME:\s*([^\n]+)', block)
        if m: malzeme = m.group(1).strip()
        
        sesler = ""
        m = re.search(r'DOĞAL SES KAYNAKLARI:\s*([^\n]+)', block)
        if m: sesler = m.group(1).strip()
        
        kacinilacak = ""
        m = re.search(r'SEKTÖRE ÖZEL KAÇINILACAKLAR:\s*([^\n]+)', block)
        if m: kacinilacak = m.group(1).strip()
        
        # Motifs
        motifs = []
        motifs_block = re.search(r'BU SEKTÖRE ÖZGÜ 10 ÇEKİM MOTİFİ\s*\n\s*\n(.*?)(?=\nÖN HAZIRLIK|\n---|\Z)', block, re.DOTALL)
        if motifs_block:
            m_lines = [l.strip() for l in motifs_block.group(1).strip().split('\n') if l.strip()]
            for ml in m_lines:
                mm = re.match(r'\d{2}\.\s*(.*)', ml)
                if mm:
                    motifs.append(mm.group(1).strip())
                elif ml:
                    motifs.append(ml)
        
        # Variations
        # Split by variation header, e.g. S077-V01 |
        var_chunks = re.split(r'\n(?=S\d{3}-V\d{2}\s*\|)', block)
        variations = []
        
        for vc in var_chunks[1:]:
            vc_lines = vc.strip().split('\n')
            v_header = vc_lines[0]
            # e.g. S077-V01 | İnşaat ve yapı malzemeleri | DOKUDAN EYLEME
            vm = re.search(r'(S\d{3}-V\d{2})\s*\|\s*([^|]+)\|\s*([^\n]+)', v_header)
            if not vm:
                continue
            var_id = vm.group(1).upper()
            var_title = vm.group(3).strip()
            
            kullanim = ""
            km = re.search(r'KULLANIM:\s*([^\n]+)', vc)
            if km: kullanim = km.group(1).strip()
            
            ana_fikir = ""
            afm = re.search(r'ANA FİKİR:\s*([^\n]+)', vc)
            if afm: ana_fikir = afm.group(1).strip()
            
            hook = ""
            hm = re.search(r'HOOK:\s*([^\n]+)', vc)
            if hm: hook = hm.group(1).strip()
            
            # Veo prompt
            veo_prompt = ""
            vpm = re.search(r'VEO PROMPTU — [^\n]+ — KOPYALANABİLİR BÖLÜM BAŞLANGICI\s*\n(.*?)\s*VEO PROMPTU — [^\n]+ — KOPYALANABİLİR BÖLÜM SONU', vc, re.DOTALL)
            if vpm:
                veo_prompt = vpm.group(1).strip()
                
            # Voiceover
            vo_sample = ""
            vom = re.search(r'TÜRKÇE DIŞ SES ÖRNEĞİ:\s*([^\n]+)', vc)
            if vom: vo_sample = vom.group(1).strip()
            
            # Negatives
            negatives = ""
            nm = re.search(r'NEGATİF PROMPT ÖRNEĞİ[^\n]*:\s*\n([^\n]+)', vc)
            if nm: negatives = nm.group(1).strip()
            
            variations.append({
                'id': var_id,
                'title': var_title,
                'usage': kullanim,
                'hasHuman': ('insanlı' in kullanim.lower() or 'elli' in kullanim.lower()),
                'idea': ana_fikir,
                'hook': hook,
                'voiceoverSample': vo_sample,
                'veoPrompt': veo_prompt,
                'negativePrompt': negatives
            })
            
        sectors[sector_id] = {
            'id': sector_id,
            'name': sector_name,
            'subject': ana_konu,
            'environment': ortam,
            'humanRoles': roller,
            'materials': malzeme,
            'soundSources': sesler,
            'forbiddenClaims': kacinilacak,
            'motifs': motifs,
            'variations': variations
        }

    print(f"Parsed {len(sectors)} sectors successfully.")
    
    # Verify count
    total_vars = sum(len(s['variations']) for s in sectors.values())
    print(f"Total variations parsed: {total_vars}")
    
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(sectors, f, ensure_ascii=False, indent=2)
        
    print(f"Saved to {output_json} ({os.path.getsize(output_json)} bytes)")

if __name__ == '__main__':
    main()
