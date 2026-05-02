import json
import os

path = r'C:\Users\Praveen P\.gemini\antigravity\brain\01e9fdd1-a42f-4060-b657-f4a0846986b1\.system_generated\logs\overview.txt'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

max_len = 0
best_content = ''
for line in lines:
    try:
        data = json.loads(line)
        c = data.get('content', '')
        if len(c) > max_len:
            max_len = len(c)
            best_content = c
    except:
        continue

with open('best_plan.md', 'w', encoding='utf-8') as out:
    out.write(best_content)
