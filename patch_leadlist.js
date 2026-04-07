const fs = require('fs');

const content = fs.readFileSync('src/components/leads/LeadList.tsx', 'utf8');

let updated = content.replace(
  'import { Lead, LeadStatus } from "@/lib/types";',
  'import { Lead, LeadStatus } from "@/lib/types";\nimport { getPaginatedLeads, getLeadsCount } from "@/lib/leadService";\nimport { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";\nimport { useEffect } from "react";'
);

updated = updated.replace(
  'type TabValue = "active" | "success" | "refusal" | "spam";',
  'type TabValue = "all" | "active" | "success" | "refusal" | "spam";'
);

updated = updated.replace(
  'export function LeadList({ leads, selectedLeadId, onSelect }: LeadListProps) {',
  `export function LeadList({ leads: initialLeadsProp, selectedLeadId, onSelect }: LeadListProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [paginatedLeads, setPaginatedLeads] = useState<Lead[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const getStatusesForTab = (tab: TabValue): LeadStatus[] | undefined => {
    switch (tab) {
      case "active": return ["new", "in_progress", "visit", "no_answer", "thinking", "callback"];
      case "success": return ["success"];
      case "refusal": return ["refusal", "bank_refusal"];
      case "spam": return ["spam"];
      case "all": default: return undefined;
    }
  };

  const fetchLeads = async (reset = false) => {
    setIsLoading(true);
    try {
      const statuses = getStatusesForTab(activeTab);
      const limitCount = 50;

      const { leads, lastDoc: newLastDoc } = await getPaginatedLeads(
        limitCount,
        reset ? null : lastDoc,
        statuses
      );

      setPaginatedLeads(prev => reset ? leads : [...prev, ...leads]);
      setLastDoc(newLastDoc || null);
      setHasMore(leads.length === limitCount);

      if (reset) {
        const count = await getLeadsCount(statuses);
        setTotalCount(count);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads(true);
  }, [activeTab]);
`
);

updated = updated.replace(
  'const filteredLeads = leads.filter(filterByTab);',
  'const filteredLeads = paginatedLeads;'
);

// We also need to add "Все" tab to TabsList
updated = updated.replace(
  '<TabsList className="w-full grid grid-cols-4 bg-zinc-100 p-1 rounded-2xl h-12">',
  `<div className="flex justify-between items-end mb-2">
          {totalCount !== null && (
            <div className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full inline-block">
              Всего: {totalCount}
            </div>
          )}
        </div>
        <TabsList className="w-full grid grid-cols-5 bg-zinc-100 p-1 rounded-2xl h-12">
             <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold text-xs sm:text-sm transition-all">
                Все
             </TabsTrigger>`
);

updated = updated.replace(
  '          </div>\n        )}\n      </div>\n    </div>\n  );\n}',
  `          </div>
        )}

        {hasMore && filteredLeads.length > 0 && (
          <div className="flex justify-center mt-6 mb-2">
            <Button
              onClick={() => fetchLeads()}
              disabled={isLoading}
              variant="outline"
              className="rounded-xl bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            >
              {isLoading ? "Загрузка..." : "Загрузить еще"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}`
);

fs.writeFileSync('src/components/leads/LeadList.tsx', updated);
