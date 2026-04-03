"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLead } from "@/lib/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { LeadSource, LeadStatus } from "@/lib/types";
import { ReactElement } from "react";

export function CreateLeadDialog({ children, onSuccess }: { children: ReactElement, onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      await createLead(
        {
          name: formData.get("name") as string,
          phone: formData.get("phone") as string,
          car: formData.get("car") as string,
          source: formData.get("source") as LeadSource,
          status: formData.get("status") as LeadStatus,
          notes: formData.get("notes") as string,
          nextActionDate: null,
        },
        user.email || "Unknown"
      );
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating lead:", error);
      alert("Ошибка при создании лида");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить клиента</DialogTitle>
          <DialogDescription>
            Заполните данные для создания новой заявки или записи клиента.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" name="name" required placeholder="Иван Иванов" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input id="phone" name="phone" required placeholder="+375 (29) 123-45-67" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="car">Интересующее авто (если есть)</Label>
            <Input id="car" name="car" placeholder="BMW X5 2019" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="source">Источник</Label>
              <Select name="source" defaultValue="walk_in">
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site">Сайт</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="call">Звонок</SelectItem>
                  <SelectItem value="zapier">Zapier/Avito</SelectItem>
                  <SelectItem value="walk_in">С улицы</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Статус</Label>
              <Select name="status" defaultValue="new">
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Новый</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="success">Оформился/купил</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Дополнительная информация..."
              className="resize-none"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={isLoading} className="bg-zinc-900 hover:bg-zinc-800 text-white">
              {isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
