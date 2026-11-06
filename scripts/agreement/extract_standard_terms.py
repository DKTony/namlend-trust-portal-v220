import sys, json, re, hashlib, pdfplumber
src, out = sys.argv[1], sys.argv[2]
BULLET = ''
sha = hashlib.sha256(open(src, 'rb').read()).hexdigest()

def page_lines(p):
    rows = []
    for ln in p.extract_text_lines(layout=False, strip=True):
        c = ln['chars']
        rows.append({'x': round(ln['x0'], 1), 'y': ln['top'], 'font': c[0]['fontname'][-2:],
                     'size': round(c[0]['size'], 1), 'text': ln['text'], 'chars': c})
    return [r for r in rows if r['size'] != 6.8]   # drop running footer

with pdfplumber.open(src) as pdf:
    lines = []
    for pi in range(3):            # pages 1-3: standard terms
        lines += [dict(r, page=pi + 1) for r in page_lines(pdf.pages[pi])]
    p4 = page_lines(pdf.pages[3])

# --- parties paragraph -------------------------------------------------------
i = next(k for k, r in enumerate(lines) if r['text'].startswith('Between:'))
parties = []
while not re.match(r'^\d+\. ', lines[i]['text']) or lines[i]['size'] != 11.2:
    parties.append(lines[i]['text']); i += 1
parties = ' '.join(parties)

# --- clauses -----------------------------------------------------------------
clauses, cur = [], None
for r in lines[i:]:
    if r['size'] == 11.2 and re.match(r'^(\d+)\. (.+)$', r['text']):
        n, title = re.match(r'^(\d+)\. (.+)$', r['text']).groups()
        cur = {'number': int(n), 'title': title, 'blocks': [], '_rows': []}
        clauses.append(cur); continue
    cur['_rows'].append(r)

WORDS = {}
def split_definition(r):
    # Split by WORD x-position, not by character: this PDF does not encode spaces as
    # characters, so a char-level join collapses "Credit Amount" into "CreditAmount".
    if r['page'] not in WORDS:
        WORDS[r['page']] = pdfplumber.open(src).pages[r['page'] - 1].extract_words()
    ws = [w for w in WORDS[r['page']] if abs(w['top'] - r['y']) < 2]
    left = ' '.join(w['text'] for w in ws if w['x0'] < 300)
    right = ' '.join(w['text'] for w in ws if w['x0'] >= 300)
    assert (left + ' ' + right).strip() == r['text'], (left, right, r['text'])
    return left, right

for c in clauses:
    rows, blocks = c.pop('_rows'), c['blocks']
    if c['number'] == 3:
        defs = []
        for r in rows:
            if r['text'] == 'Term Meaning': continue
            term, meaning = split_definition(r)
            if term: defs.append({'term': term, 'meaning': meaning})
            else: defs[-1]['meaning'] += ' ' + meaning
        blocks.append({'type': 'definitions', 'rows': defs}); continue
    if c['number'] == 18:
        sig_start = next(k for k, r in enumerate(rows) if r['text'].startswith('Signed at:'))
        rows = rows[:sig_start]               # signature grid is rendered from data
    items, para = None, []
    for r in rows:
        t = r['text']
        if t.startswith(BULLET):
            if items is None: items = []; blocks.append({'type': 'bullets', 'items': items})
            items.append(t[len(BULLET):].strip())
        elif items is not None and r['x'] > 60:
            items[-1] += ' ' + t
        else:
            para.append(t)
    if para: blocks.append({'type': 'paragraph', 'text': ' '.join(para)})

# --- Schedule A acceptance statement (legal wording on page 4) ---------------
k = next(j for j, r in enumerate(p4) if r['text'].startswith('I, the Borrower'))
acc = []
while not p4[k]['text'].startswith('Borrower signature'):
    acc.append(p4[k]['text']); k += 1
title = next(r['text'] for r in page_lines(pdfplumber.open(src).pages[0]) if r['text'].startswith('STANDARD TERMS'))
sched_title = next(r['text'] for r in p4 if r['text'].startswith('SCHEDULE A'))

doc = {'title': title, 'scheduleTitle': sched_title, 'parties': parties, 'clauses': clauses,
       'scheduleAcceptance': ' '.join(acc), 'sourceSha256': sha}
json.dump(doc, open(out, 'w'), ensure_ascii=False, indent=1)
print('clauses:', [c['number'] for c in clauses])
print('block types:', {c['number']: [b['type'] for b in c['blocks']] for c in clauses})
print('definitions:', [d['term'] for d in clauses[2]['blocks'][0]['rows']])
print('bullets in clause 2:', len(clauses[1]['blocks'][0]['items']))
print('sha256:', sha)
