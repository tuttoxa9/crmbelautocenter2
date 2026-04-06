import re

file_path = 'src/app/(dashboard)/leads/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure the container doesn't overflow on xl by adjusting flex and gap
content = content.replace(
    'flex overflow-x-auto snap-x snap-mandatory xl:snap-none xl:justify-between gap-4 pb-4 h-full',
    'flex overflow-x-auto snap-x snap-mandatory xl:snap-none xl:justify-between gap-4 xl:gap-2 pb-4 h-[calc(100vh-200px)] xl:overflow-x-hidden'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
