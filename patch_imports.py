import re

with open('/tmp/belautocenter2/app/catalog/[id]/car-details-client.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'firestoreApi' not in content[:1500]:
    content = content.replace('import { useSettings } from "@/hooks/use-settings"', 'import { useSettings } from "@/hooks/use-settings"\nimport { firestoreApi } from "@/lib/firestore-api"')

with open('/tmp/belautocenter2/app/catalog/[id]/car-details-client.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('/tmp/belautocenter2/app/home-client.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'firestoreApi' not in content[:1500]:
    content = content.replace('import { useSubmission } from "@/components/providers/submission-provider"', 'import { useSubmission } from "@/components/providers/submission-provider"\nimport { firestoreApi } from "@/lib/firestore-api"')

with open('/tmp/belautocenter2/app/home-client.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('/tmp/belautocenter2/app/credit/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'firestoreApi' not in content[:1500]:
    content = content.replace('import { useSubmission } from "@/components/providers/submission-provider"', 'import { useSubmission } from "@/components/providers/submission-provider"\nimport { firestoreApi } from "@/lib/firestore-api"')

with open('/tmp/belautocenter2/app/credit/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('/tmp/belautocenter2/app/leasing/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'firestoreApi' not in content[:1500]:
    content = content.replace('import { useSubmission } from "@/components/providers/submission-provider"', 'import { useSubmission } from "@/components/providers/submission-provider"\nimport { firestoreApi } from "@/lib/firestore-api"')

with open('/tmp/belautocenter2/app/leasing/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
