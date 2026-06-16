import re
with open("src/components/layout/AuthGuard.tsx", "r") as f:
    content = f.read()

content = re.sub(r'return <>{user \? children : null}</>;', 'return <>{children}</>;', content)

with open("src/components/layout/AuthGuard.tsx", "w") as f:
    f.write(content)
