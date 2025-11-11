// src/pages/DailyReport.tsx

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  FileText,
  Save,
  Plus,
  AlertCircle,
  Loader2,
  History,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  DeviceReport,
  DeviceReportForm,
} from "@/components/Report/DeviceReportForm";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

interface ReportHistoryRecord {
  id: string;
  report_date: string;
  shift_number: string;
  device_id: string;
  device_name: string;
  total_sales: number;
}

const DailyReport = () => {
  const { profile, employee } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [reportHistory, setReportHistory] = useState<ReportHistoryRecord[]>([]);
  const [reportValidation, setReportValidation] = useState<Record<string, boolean>>({});

  const [deviceReports, setDeviceReports] = useState<DeviceReport[]>([
    {
      id: uuidv4(),
      deviceId: "",
      accountId: "",
      shift: "",
      liveStatus: "",
      kategoriProduk: "",
      openingBalance: 0,
      closingBalance: 0,
    },
  ]);

  const [availableDevices, setAvailableDevices] = useState<
    { id: string; name: string }[]
  >([]);
  const [availableAccounts, setAvailableAccounts] = useState<
    { id: string; name: string }[]
  >([]);

  // FETCH HISTORY
  const fetchReportHistory = useCallback(async () => {
    if (!employee) return;
    setLoading(true);

    try {
      const { data: historyData, error: historyError } = await supabase
        .from("daily_reports")
        .select(
          `
                id,
                report_date,
                shift_number,
                total_sales,
                device_id,
                devices ( device_id )
            `
        )
        .eq("employee_id", employee.id)
        .order("report_date", { ascending: false })
        .order("shift_number", { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      const processedHistory: ReportHistoryRecord[] = (historyData as any[]).map(
        (item) => ({
          id: item.id,
          report_date: item.report_date,
          shift_number: item.shift_number,
          device_id: item.device_id,
          device_name: item.devices?.device_id || "Device Dihapus",
          total_sales: item.total_sales,
        })
      );

      setReportHistory(processedHistory);
    } catch (error: any) {
      toast.error("Gagal memuat riwayat laporan.");
      console.error("Error fetching report history:", error.message);
    } finally {
      setLoading(false);
    }
  }, [employee]);

  // FETCH DROPDOWN DATA
  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!employee?.group_id) {
        setAvailableDevices([]);
        setAvailableAccounts([]);
        if (profile && !employee) {
          toast.warning(
            "Anda belum dialokasikan ke Group manapun. Harap hubungi Leader/Superadmin."
          );
        }
        return;
      }

      setLoadingData(true);
      try {
        // 1. Fetch devices
        const { data: devicesData, error: devicesError } = await supabase
          .from("devices")
          .select("id, device_id")
          .eq("group_id", employee.group_id);

        if (devicesError) throw devicesError;

        setAvailableDevices(
          devicesData.map((d) => ({
            id: d.id,
            name: d.device_id,
          })) || []
        );

        // 2. Fetch accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from("accounts")
          .select("id, username")
          .eq("group_id", employee.group_id);

        if (accountsError) throw accountsError;

        setAvailableAccounts(
          accountsData.map((a) => ({
            id: a.id,
            name: a.username,
          })) || []
        );
      } catch (error: any) {
        toast.error("Gagal memuat data device/akun.", {
          description: "Pastikan Anda sudah dialokasikan ke group.",
        });
        console.error("Error fetching dropdown data:", error.message);
      } finally {
        setLoadingData(false);
      }
    };

    if (employee) {
      fetchDropdownData();
      fetchReportHistory();
    }
  }, [employee, profile, fetchReportHistory]);

  // Setup real-time subscription untuk report history
  useEffect(() => {
    if (!employee?.id) return;

    const subscription = supabase
      .channel(`daily_reports_${employee.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_reports",
          filter: `employee_id=eq.${employee.id}`,
        },
        (payload) => {
          console.log("Daily report changed:", payload);
          fetchReportHistory();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [employee?.id, fetchReportHistory]);

  // ADD DEVICE REPORT
  const addDeviceReport = () => {
    if (deviceReports.length >= 10) {
      toast.warning("Anda sudah mencapai batas maksimum 10 device.");
      return;
    }
    const newId = uuidv4();
    setDeviceReports([
      ...deviceReports,
      {
        id: newId,
        deviceId: "",
        accountId: "",
        shift: "",
        liveStatus: "",
        kategoriProduk: "",
        openingBalance: 0,
        closingBalance: 0,
      },
    ]);
    setReportValidation((prev) => ({ ...prev, [newId]: false }));
  };

  // REMOVE DEVICE REPORT
  const removeDeviceReport = (id: string) => {
    if (deviceReports.length <= 1) {
      toast.error("Minimal harus ada 1 laporan device.");
      return;
    }
    setDeviceReports(deviceReports.filter((report) => report.id !== id));
    setReportValidation((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  // UPDATE DEVICE REPORT
  const updateDeviceReport = (
    id: string,
    field: keyof DeviceReport,
    value: any
  ) => {
    setDeviceReports((prevReports) =>
      prevReports.map((report) =>
        report.id === id ? { ...report, [field]: value } : report
      )
    );
  };

  // HANDLE VALIDATION
  const handleDeviceValidation = (id: string, isValid: boolean) => {
    setReportValidation((prev) => ({ ...prev, [id]: isValid }));
  };

  const isAllValid =
    Object.values(reportValidation).every(Boolean) && deviceReports.length > 0;

  // HANDLE SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee) {
      toast.error("Gagal memuat data karyawan. Silakan login ulang.");
      return;
    }

    if (!isAllValid) {
      toast.error("Terdapat data laporan yang belum lengkap atau tidak valid.", {
        description:
          "Mohon periksa semua field yang bertanda (*) dan pastikan Omset Akhir ≥ Omset Awal.",
      });
      return;
    }

    setLoading(true);
    toast.info("Sedang mengirim laporan...");

    try {
      const formattedDate = format(date, "yyyy-MM-dd");

      const shiftStatusEnum = (report: DeviceReport) =>
        report.liveStatus === "Lancar" ? "smooth" : "dead_relive";

      const reportPayloads = deviceReports.map((report) => ({
        employee_id: employee.id,
        report_date: formattedDate,
        shift_status: shiftStatusEnum(report),
        opening_balance: report.openingBalance,
        closing_balance: report.closingBalance,
        total_sales: report.closingBalance - report.openingBalance,
        notes: notes,
        device_id: report.deviceId,
        account_id: report.accountId,
        shift_number: report.shift,
        live_status: report.liveStatus,
        kategori_produk: report.kategoriProduk,
      }));

      // UPSERT dengan conflict strategy
      const { error: deviceError } = await supabase
        .from("daily_reports")
        .upsert(reportPayloads as any, {
          onConflict: "employee_id, report_date, device_id",
          ignoreDuplicates: false,
        });

      if (deviceError) throw deviceError;

      // UPDATE ATTENDANCE (Check-out otomatis)
      const { error: attendanceError } = await supabase
        .from("attendance")
        .upsert(
          {
            employee_id: employee.id,
            attendance_date: formattedDate,
            check_out: new Date().toISOString(),
            status: "present",
          },
          {
            onConflict: "employee_id, attendance_date",
          }
        );

      if (attendanceError) throw attendanceError;

      toast.success("Laporan harian berhasil dikirim!");
      toast.info("Absen keluar Anda telah otomatis tercatat.");

      // Refresh history (real-time akan trigger juga)
      fetchReportHistory();

      // Reset form
      setNotes("");
      const initialReportId = uuidv4();
      setDeviceReports([
        {
          id: initialReportId,
          deviceId: "",
          accountId: "",
          shift: "",
          liveStatus: "",
          kategoriProduk: "",
          openingBalance: 0,
          closingBalance: 0,
        },
      ]);
      setReportValidation({ [initialReportId]: false });
    } catch (error: any) {
      console.error(error);
      toast.error(
        `Gagal mengirim laporan: ${error.message || "Error tidak diketahui"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // CALCULATE TOTAL OMSET
  const totalOmset = deviceReports.reduce(
    (acc, report) => acc + (report.closingBalance - report.openingBalance),
    0
  );

  const formatDateOnly = (dateString: string) => {
    return format(new Date(dateString + "T00:00:00"), "dd MMM yyyy", {
      locale: indonesiaLocale,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <MainLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Jurnal Laporan Harian</h1>
            <p className="text-muted-foreground">
              Khusus Staff: Laporan omset harian per shift.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Hanya Staff</span>
          </div>
        </div>

        {/* MASTER INFO CARD */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Laporan</CardTitle>
            <CardDescription>
              Data ini akan digunakan untuk semua laporan device di bawah.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Tanggal Laporan */}
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal Laporan *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? (
                        format(date, "PPP", { locale: indonesiaLocale })
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Nama Karyawan */}
              <div className="space-y-2">
                <Label htmlFor="employee-name">Nama Karyawan</Label>
                <Input
                  id="employee-name"
                  value={profile?.full_name || "Memuat..."}
                  disabled
                  readOnly
                  className="bg-muted/50"
                />
              </div>

              {/* Group */}
              <div className="space-y-2">
                <Label htmlFor="employee-group">Group</Label>
                <Input
                  id="employee-group"
                  value={employee?.group_id || "Memuat..."}
                  disabled
                  readOnly
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Device & Akun disaring berdasarkan group Anda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loadingData && (
          <div className="flex justify-center items-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              Memuat daftar Device & Akun...
            </span>
          </div>
        )}

        {/* MULTI-DEVICE REPORT FORMS */}
        <div className="space-y-4">
          {deviceReports.map((report, index) => (
            <DeviceReportForm
              key={report.id}
              report={report}
              reportDate={date}
              reportIndex={index}
              onUpdate={updateDeviceReport}
              onRemove={removeDeviceReport}
              devices={availableDevices}
              accounts={availableAccounts}
              onValidate={handleDeviceValidation}
            />
          ))}
        </div>

        {/* TOMBOL TAMBAH DEVICE */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={addDeviceReport}
          disabled={deviceReports.length >= 10 || loadingData}
        >
          <Plus className="h-4 w-4" />
          Tambah Laporan Device (Max 10)
        </Button>

        {/* SUMMARY & SUBMIT */}
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Laporan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Omset */}
              <div className="space-y-2">
                <Label>Total Omset Keseluruhan</Label>
                <Input
                  value={formatCurrency(totalOmset)}
                  readOnly
                  disabled
                  className="text-2xl font-bold h-12 border-none bg-transparent p-0"
                />
              </div>

              {/* Catatan */}
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Input
                  id="notes"
                  placeholder="Tambah catatan tentang laporan hari ini..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            <div className="flex gap-2">
              <Button
                type="submit"
                className="gap-2"
                disabled={loading || loadingData || !isAllValid}
              >
                <Save className="h-4 w-4" />
                {loading ? "Menyimpan..." : "Kirim Laporan & Absen Keluar"}
              </Button>
            </div>
            {!isAllValid && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive w-full">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>
                  Laporan <strong>belum lengkap</strong> atau <strong>tidak valid</strong>.
                  Harap periksa semua <strong>field</strong> yang wajib diisi.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary w-full">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>
                Mengirim laporan ini akan otomatis mencatat{" "}
                <strong>Absen Keluar</strong> Anda untuk hari ini.
              </p>
            </div>
          </CardFooter>
        </Card>

        {/* RIWAYAT LAPORAN */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Riwayat 10 Laporan Terakhir
            </CardTitle>
            <CardDescription>
              Laporan harian yang telah Anda kirim (terbaru di atas).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && reportHistory.length === 0 ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : reportHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Belum ada riwayat laporan harian yang dicatat.
              </p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead className="text-right">Omset (IDR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDateOnly(item.report_date)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Shift {item.shift_number}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.device_name}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total_sales)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </MainLayout>
  );
};

export default DailyReport;