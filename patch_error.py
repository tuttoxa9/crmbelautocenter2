import re

with open('/tmp/belautocenter2/app/catalog/[id]/car-details-client.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("} catch (error) {\n      }", "} catch (error) {\n        console.error('Firestore Error', error)\n      }")

with open('/tmp/belautocenter2/app/catalog/[id]/car-details-client.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
