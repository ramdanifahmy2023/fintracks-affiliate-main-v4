// src/components/Employee/BulkImportDialog.tsx

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileCheck2, FileWarning, Upload } from "lucide-react";
import Papa from "papaparse"; // Pastikan kamu sudah install: npm i papaparse @types/papaparse

// Tipe data baris CSV
interface CsvRow {
  full_name: string;
  email: string;
  password: string;
  position: string;
  role: "superadmin" | "leader" | "admin" | "staff" | "viewer";
  phone?: string | null;
  group_id?: string | null; // ID grup (UUID) atau "no-group"
  address?: string | null;
  date_of_birth?: string | null;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BulkImportDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("Belum ada file dipilih");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type !== "text/csv") {
        toast.error("Format file salah. Harap unggah file .csv");
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleClose = () => {
    setFile(null);
    setFileName("Belum ada file dipilih");
    setLoading(false);
    onOpenChange(false);
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Harap pilih file CSV terlebih dahulu.");
      return;
    }

    setLoading(true);
    toast.info(`Memulai import dari ${file.name}...`);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        let successCount = 0;
        let errorCount = 0;

        // Beri tahu pengguna bahwa proses akan memakan waktu
        toast.info(
          `Memproses ${rows.length} baris... Ini mungkin memakan waktu.`,
        );

        // Kita panggil fungsi 'create-user' satu per satu untuk setiap baris
        // Ini lebih aman karena menggunakan logika backend yang sudah ada
        for (const [index, row] of rows.entries()) {
          const baris = index + 2; // +1 untuk header, +1 untuk index 0
          try {
            // 1. Validasi
            if (
              !row.full_name ||
              !row.email ||
              !row.password ||
              !row.position ||
              !row.role
            ) {
              throw new Error(
                "Field wajib (full_name, email, password, position, role) tidak lengkap.",
              );
            }
            if (row.password.length < 8) {
              throw new Error("Password minimal 8 karakter.");
            }

            // 2. Siapkan Payload
            const payload = {
              email: row.email.trim(),
              password: row.password,
              fullName: row.full_name.trim(),
              phone: row.phone?.trim() || null,
              role: row.role.trim(),
              position: row.position.trim(),
              groupId: row.group_id?.trim() || "no-group",
              address: row.address?.trim() || null,
              date_of_birth: row.date_of_birth?.trim() || null,
            };

            // 3. Panggil Edge Function
            const { data, error } = await supabase.functions.invoke(
              "create-user",
              {
                body: payload,
              },
            );

            if (error || (data && !data.success)) {
              throw new Error(data?.error || error.message);
            }

            successCount++;
          } catch (error: any) {
            console.error(`Gagal impor baris ${baris}:`, error.message);
            toast.error(`Gagal impor baris ${baris} (${row.email})`, {
              description: error.message,
            });
            errorCount++;
          }
        }

        // Selesai
        toast.success(`Impor Selesai!`, {
          description: `${successCount} karyawan berhasil ditambah, ${errorCount} gagal.`,
        });
        onSuccess();
        handleClose();
      },
      error: (error: any) => {
        toast.error("Gagal membaca file CSV.", { description: error.message });
        setLoading(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Karyawan (Bulk CSV)</DialogTitle>
          <DialogDescription>
            Unggah file CSV untuk menambahkan banyak karyawan sekaligus.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>Format CSV Wajib!</AlertTitle>
          <AlertDescription>
            Pastikan file CSV Anda memiliki header (wajib):{" "}
            <strong>
              full_name, email, password, position, role
            </strong>
            .
            <br />
            Header opsional:{" "}
            <strong>
              phone, group_id, address, date_of_birth
            </strong>
            .
            <br />
            Nilai 'role' harus: superadmin, leader, admin, staff, atau viewer.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Pilih File CSV</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Pilih File...
            </Button>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
            />
            <Input
              value={fileName}
              readOnly
              disabled
              className="flex-1"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={loading || !file}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileCheck2 className="mr-2 h-4 w-4" />
            )}
            {loading ? "Mengimpor..." : "Mulai Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};