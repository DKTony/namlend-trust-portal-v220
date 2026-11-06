import sys, json, re, pdfplumber
src, terms = sys.argv[1], json.load(open(sys.argv[2]))
norm = lambda s: re.sub(r'\s+', ' ', s).strip()

# Source: pages 1-3 text from "Between:" up to the signature grid, footer and bullet glyphs removed.
with pdfplumber.open(src) as pdf:
    raw = '\n'.join(
        '\n'.join(l['text'] for l in p.extract_text_lines(strip=True) if round(l['chars'][0]['size'], 1) != 6.8)
        for p in pdf.pages[:3])
    p4 = norm(pdf.pages[3].extract_text())
region = raw[raw.index('Between:'):raw.index('Signed at:')]
region = norm(region.replace('', '').replace('\nTerm Meaning\n', '\n'))

# Template rebuilt in document order.
parts = [terms['parties']]
for c in terms['clauses']:
    parts.append(f"{c['number']}. {c['title']}")
    for b in c['blocks']:
        if b['type'] == 'paragraph': parts.append(b['text'])
        elif b['type'] == 'bullets': parts += b['items']
        else: parts += [f"{r['term']} {r['meaning']}" for r in b['rows']]
rebuilt = norm(' '.join(parts))

print('standard terms, exact match :', rebuilt == region, f'({len(region)} chars)')
if rebuilt != region:
    i = next(k for k in range(min(len(rebuilt), len(region))) if rebuilt[k] != region[k])
    print('  first diff at', i, '\n  src:', region[i-60:i+60], '\n  tpl:', rebuilt[i-60:i+60])
print('Schedule A acceptance found:', norm(terms['scheduleAcceptance']) in p4)
print('titles found               :', terms['title'] in raw, '|', terms['scheduleTitle'] in p4)
print('clause numbering 1..18     :', [c['number'] for c in terms['clauses']] == list(range(1, 19)))
