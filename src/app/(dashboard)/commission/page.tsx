"use client";

import { useEffect, useState } from "react";
import { commissionService, Commission, CommissionStatus } from "@/lib/services/commission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const STATUSES: CommissionStatus[] = ["Новый", "В работе", "Думает", "Встреча назначена", "Авто на комиссии", "Отказ"];

export default function CommissionPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const { user } = useAuth();

  // Form State
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [carDetails, setCarDetails] = useState("");
  const [status, setStatus] = useState<CommissionStatus>("Новый");
  const [nextContactDate, setNextContactDate] = useState("");
  const [notes, setNotes] = useState("");

  const loadCommissions = async () => {
    try {
      const data = await commissionService.getCommissions();
      setCommissions(data);
    } catch (error) {
      console.error("Failed to load commissions", error);
    }
  };

  useEffect(() => {
    loadCommissions();
  }, []);

  const handleOpenDialog = (commission?: Commission) => {
    if (commission) {
      setEditingCommission(commission);
      setClientName(commission.clientName);
      setPhone(commission.phone);
      setCarDetails(commission.carDetails);
      setStatus(commission.status);
      setNextContactDate(commission.nextContactDate ? format(commission.nextContactDate, "yyyy-MM-dd") : "");
      setNotes(commission.notes);
    } else {
      setEditingCommission(null);
      setClientName("");
      setPhone("");
      setCarDetails("");
      setStatus("Новый");
      setNextContactDate("");
      setNotes("");
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const parsedDate = nextContactDate ? new Date(nextContactDate) : null;
      
      if (editingCommission && editingCommission.id) {
        await commissionService.updateCommission(editingCommission.id, {
          clientName,
          phone,
          carDetails,
          status,
          nextContactDate: parsedDate,
          notes,
        });
      } else {
        await commissionService.addCommission({
          clientName,
          phone,
          carDetails,
          status,
          nextContactDate: parsedDate,
          notes,
          createdBy: user?.uid || "unknown",
        });
      }
      setIsDialogOpen(false);
      loadCommissions();
    } catch (error) {
      console.error("Failed to save commission", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту запись?")) {
      try {
        await commissionService.deleteCommission(id);
        loadCommissions();
      } catch (error) {
        console.error("Failed to delete commission", error);
      }
    }
  };

  const filteredCommissions = commissions.filter(c => 
    c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.carDetails.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 border-b border-zinc-200 flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-semibold text-zinc-900">Комиссия (Холодный обзвон)</h1>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input 
              placeholder="Поиск..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Добавить запись
              </Button>
            } />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingCommission ? "Редактировать запись" : "Новая запись"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Имя</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Телефон</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Авто</Label>
                  <Input value={carDetails} onChange={(e) => setCarDetails(e.target.value)} className="col-span-3" placeholder="Марка, модель, год..." />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Статус</Label>
                  <div className="col-span-3">
                    <Select value={status} onValueChange={(val: CommissionStatus) => setStatus(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">След. контакт</Label>
                  <Input type="date" value={nextContactDate} onChange={(e) => setNextContactDate(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <Label className="text-right pt-2">Заметки</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3 h-24" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                <Button onClick={handleSave}>Сохранить</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="border border-zinc-200 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата создания</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Автомобиль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>След. контакт</TableHead>
                <TableHead>Заметки</TableHead>
                <TableHead className="w-[100px] text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                    Записей пока нет
                  </TableCell>
                </TableRow>
              ) : (
                filteredCommissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="text-zinc-500">
                      {format(commission.createdAt, "dd MMM yyyy", { locale: ru })}
                    </TableCell>
                    <TableCell className="font-medium">{commission.clientName}</TableCell>
                    <TableCell>{commission.phone}</TableCell>
                    <TableCell>{commission.carDetails}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
                        {commission.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {commission.nextContactDate 
                        ? format(commission.nextContactDate, "dd MMM yyyy", { locale: ru }) 
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-zinc-500" title={commission.notes}>
                      {commission.notes}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(commission)}>
                          <Edit2 className="w-4 h-4 text-zinc-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => commission.id && handleDelete(commission.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
