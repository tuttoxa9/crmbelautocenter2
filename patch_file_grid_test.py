import re

with open("src/components/files/FileGrid.tsx", "r") as f:
    content = f.read()

content = content.replace("export function FileGrid({", """
const testItems: any[] = [
    { name: 'test-doc1.pdf', path: 'test-doc1.pdf', type: 'file', lastModified: '2026-07-13T10:00:00Z', size: 1024 },
    { name: 'test-folder1', path: 'test-folder1/', type: 'folder', lastModified: '2026-07-13T11:00:00Z' },
    { name: 'test-folder2', path: 'test-folder2/', type: 'folder', lastModified: '2026-07-12T10:00:00Z' },
    { name: 'test-doc2.txt', path: 'test-doc2.txt', type: 'file', lastModified: '2026-07-11T10:00:00Z', size: 2048 },
];

export function FileGrid({""")

content = content.replace("items.reduce", "(items.length === 0 ? testItems : items).reduce")

with open("src/components/files/FileGrid.tsx", "w") as f:
    f.write(content)
