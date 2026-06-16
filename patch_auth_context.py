import re
with open("src/contexts/AuthContext.tsx", "r") as f:
    content = f.read()

content = content.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(false);')
content = content.replace('const [user, setUser] = useState<User | null>(null);', 'const [user, setUser] = useState<User | null>({ uid: "123", email: "test@test.com" } as any);')
content = content.replace('const [userRole, setUserRole] = useState<"admin" | "commission" | null>(null);', 'const [userRole, setUserRole] = useState<"admin" | "commission" | null>("admin");')

content = re.sub(r'if \(!user && pathname !== "/login"\) \{[\s\S]*?\} else if \(user && \(pathname === "/login" \|\| pathname === "\/"\)\) \{[\s\S]*?\}', '', content)

with open("src/contexts/AuthContext.tsx", "w") as f:
    f.write(content)
