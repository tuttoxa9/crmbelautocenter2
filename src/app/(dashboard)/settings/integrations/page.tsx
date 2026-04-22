"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Integration } from "@/lib/types";
import { subscribeToIntegrations, createIntegration, updateIntegration, deleteIntegration } from "@/lib/integrationService";
import { Trash2, Plus, Edit2, Play, Square } from "lucide-react";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Integration>>({
    source: "meta",
    name: "",
    campaignId: "",
    formId: "",
    isActive: true,
    notes: ""
  });

  useEffect(() => {
    const unsubscribe = subscribeToIntegrations((data) => {
      setIntegrations(data);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async () => {
    try {
      setIsLoading(true);
      await createIntegration({
        source: formData.source as "meta" | "tiktok",
        name: formData.name || "Новая интеграция",
        campaignId: formData.campaignId,
        formId: formData.formId,
        isActive: formData.isActive ?? true,
        notes: formData.notes
      });
      setIsDialogOpen(false);
      setFormData({ source: "meta", name: "", campaignId: "", formId: "", isActive: true, notes: "" });
    } catch (error) {
      console.error(error);
      alert("Failed to create integration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await updateIntegration(id, { isActive: !current });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить интеграцию?")) {
      try {
        await deleteIntegration(id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Интеграции</h2>
          <p className="text-sm text-gray-500 mt-1">Подключение Meta Lead Ads и TikTok Forms</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Добавить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая интеграция</DialogTitle>
              <DialogDescription>
                Подключите новую форму Lead Ads для автоматического приема лидов.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Источник</Label>
                <Select value={formData.source} onValueChange={(val) => setFormData({ ...formData, source: val as any })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите источник" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta">Meta (Facebook/Instagram)</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Например: Кампания Auto Кредит март" />
              </div>
              <div className="space-y-2">
                <Label>ID Формы (обязательно для точного матчинга)</Label>
                <Input value={formData.formId} onChange={(e) => setFormData({ ...formData, formId: e.target.value })} placeholder="112233445566" />
              </div>
              <div className="space-y-2">
                <Label>ID Кампании (опционально)</Label>
                <Input value={formData.campaignId} onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })} placeholder="..." />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isLoading} onClick={handleCreate}>
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Активные подключения</CardTitle>
          <CardDescription>Список всех настроенных рекламных кампаний и форм</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Form ID</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    Интеграций пока нет. Добавьте первую!
                  </TableCell>
                </TableRow>
              ) : (
                integrations.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell className="font-medium">{integration.name}</TableCell>
                    <TableCell>
                      {integration.source === 'meta' ? (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">Meta</span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-600/20">TikTok</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 font-mono text-xs">{integration.formId || "Не указан"}</TableCell>
                    <TableCell>
                      {integration.isActive ? (
                        <span className="text-emerald-600 text-sm font-medium flex items-center"><Play className="h-3 w-3 mr-1" /> Активен</span>
                      ) : (
                        <span className="text-gray-400 text-sm font-medium flex items-center"><Square className="h-3 w-3 mr-1" /> Остановлен</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive(integration.id!, integration.isActive)} title={integration.isActive ? "Остановить" : "Запустить"}>
                        {integration.isActive ? <Square className="h-4 w-4 text-gray-500" /> : <Play className="h-4 w-4 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(integration.id!)} className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
