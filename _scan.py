import re
html = open('frontend/index.html', encoding='utf-8').read()
# body only (between </style> and <script type="application/json")
body = html.split('</style>', 1)[1].split('<script type="application/json"')[0]
body = re.sub(r'<svg.*?</svg>', '', body, flags=re.S)
body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
for i, line in enumerate(body.split('\n'), 1):
    txt = re.sub(r'<[^>]+>', '|', line)
    txt = re.sub(r'[|\s]+', ' ', txt).strip()
    if re.search(r'[\u4e00-\u9fff]', txt):
        out = txt.encode('utf-8').decode('utf-8')
        print(f"{i}: {out[:120]}")
