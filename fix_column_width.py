import re

file_path = 'src/components/leads/LeadColumn.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make columns fit exactly on desktop without horizontal scrolling
content = content.replace(
    'min-w-[280px] sm:min-w-[320px] xl:min-w-[260px] max-w-[350px] xl:max-w-none flex-1 shrink-0',
    'min-w-[280px] sm:min-w-[320px] xl:min-w-[180px] max-w-[350px] xl:max-w-[calc(100%/6)] flex-1 shrink-0 xl:shrink'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
