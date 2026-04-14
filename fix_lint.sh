sed -i "s/import { Loader2 }/import { }/" src/app/\(dashboard\)/leads/page.tsx
sed -i "s/import { Lead, LeadStatus }/import { Lead }/" src/components/leads/LeadList.tsx
sed -i "s/import { Clock, Phone, CalendarIcon, Loader2, Plus }/import { Clock, Phone, CalendarIcon, Loader2 }/" src/components/leads/LeadList.tsx
sed -i "s/import { LeadSource, LeadStatus }/import { LeadSource }/" src/components/leads/CreateLeadDialog.tsx
sed -i "s/import { Copy, CheckCircle2, Phone, X, Pencil, Trash2, Clock, CalendarIcon, FileText, Smartphone, MapPin, Loader2 }/import { Copy, CheckCircle2, Phone, X, Pencil, Trash2, Clock, CalendarIcon, FileText, Smartphone, MapPin }/" src/components/leads/LeadDetails.tsx
sed -i "s/import { LeadStatus, LeadSource }/import { LeadStatus }/" src/lib/displayUtils.ts
