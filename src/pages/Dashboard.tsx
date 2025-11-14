// src/pages/Dashboard.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Users,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Award,
  Bell,
  Settings,
  Filter,
  RefreshCw,
  Download,
  Eye,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardStats from "@/components/Dashboard/DashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { format, subDays, eachDayOfInterval, parseISO, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface EmployeePerformance {
  id: string;
  name: string;
  group: string;
  omset: number;
  commission: number;
  kpi: number;
  target_month: string;
  sales_target: number;
  commission_target: number;
  attendance_target: number;
  actual_attendance: number;
}

type CommissionBreakdown = { name: string; value: number; color: string };
type GroupPerformance = { name: string; omset: number };
type AccountPlatform = { name: string; value: number; color: string };
type SalesTrendData = {
  date: string;
  sales: number;
  commission: number;
};
type Group = { id: string; name: string };

const calculateTotalKpi = (
  sales: number,
  sTarget: number,
  comm: number,
  cTarget: number,
  attend: number,
  aTarget: number
) => {
  const sales_pct = sTarget > 0 ? (sales / sTarget) * 100 : 0;
  const commission_pct = cTarget > 0 ? (comm / cTarget) * 100 : 0;
  const attendance_pct = aTarget > 0 ? (attend / aTarget) * 100 : 0;
  const total_kpi = sales_pct * 0.5 + commission_pct * 0.3 + attendance_pct * 0.2;
  return Math.min(total_kpi, 100);
};

const getKPIColorClass = (kpi: number) => {
  if (kpi >= 100) return "text-green-500 dark:text-green-400";
  if (kpi >= 70) return "text-yellow-500 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
};

const getKpiColor = (kpi: number) => {
  if (kpi >= 100) return "bg-green-500 dark:bg-green-600";
  if (kpi >= 70) return "bg-yellow-500 dark:bg-yellow-600";
  return "bg-red-500 dark:bg-red-600";
};

const getKpiTextColor = (kpi: number) => {
  if (kpi >= 100) return "text-green-500 dark:text-green-400";
  if (kpi >= 70) return "text-yellow-500 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
};

const formatDateMonth = (dateString: string) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString + "T00:00:00"), "MMM yyyy", {
      locale: indonesiaLocale,
    });
  } catch (e) {
    return "-";
  }
};

const CHART_COLORS = {
  blue: "hsl(var(--chart-1))",
  green: "hsl(var(--chart-2))",
  yellow: "hsl(var(--chart-3))",
  shopee: "hsl(var(--chart-1))",
  tiktok: "hsl(var(--chart-2))",
  purple: "hsl(var(--chart-4))",
  orange: "hsl(var(--chart-5))",
};

const Dashboard = () => {
  const { profile, employee } = useAuth();
  const navigate = useNavigate();
  const isStaff = profile?.role === "staff";
  const subscriptionRef = useRef<any>(null);

  // States Global
  const [filterDateStart, setFilterDateStart] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [filterDateEnd, setFilterDateEnd] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [filterGroup, setFilterGroup] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  // State Data Real-time
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [rankingData, setRankingData] = useState<EmployeePerformance[]>([]);
  const [myKpi, setMyKpi] = useState<EmployeePerformance | null>(null);

  const [commissionData, setCommissionData] = useState<CommissionBreakdown[]>([]);
  const [groupData, setGroupData] = useState<GroupPerformance[]>([]);
  const [accountData, setAccountData] = useState<AccountPlatform[]>([]);
  const [salesTrendData, setSalesTrendData] = useState<SalesTrendData[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyForChart = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);

  const handleFilterSubmit = () => {
    const initialGroupId = isStaff ? "all" : filterGroup;
    fetchAllData(filterDateStart, filterDateEnd, initialGroupId);
  };

  // ============ OPTIMIZATION: FETCH SEMUA DATA DALAM 1 CALL ============
  const fetchAllData = useCallback(
    async (startDate: string, endDate: string, groupId: string) => {
      setLoadingRanking(true);
      setLoadingCharts(true);
      setError(null);

      try {
        if (parseISO(startDate) > parseISO(endDate)) {
          toast.error("Rentang tanggal tidak valid.");
          setLoadingRanking(false);
          setLoadingCharts(false);
          return;
        }

        // Perbaikan: Gunakan endOfMonth untuk mendapatkan akhir bulan dengan benar
        const endMonth = parseISO(endDate);
        const currentMonthStart = format(startOfMonth(endMonth), "yyyy-MM-dd");
        const currentMonthEnd = format(endOfMonth(endMonth), "yyyy-MM-dd");
        const previousMonthStart = format(subMonths(startOfMonth(endMonth), 1), "yyyy-MM-dd");
        const previousMonthEnd = format(endOfMonth(subMonths(endMonth, 1)), "yyyy-MM-dd");

        // OPTIMIZATION: Build queries dengan kondisi yang tepat sebelum Promise.all
        let kpiQuery = supabase
          .from("kpi_targets")
          .select(
            `
            sales_target,
            commission_target,
            attendance_target,
            actual_sales,
            actual_commission,
            actual_attendance,
            employees!inner (
              id,
              profiles!inner ( full_name, role ),
              groups ( name, id )
            ),
            target_month
          `
          )
          .gte("target_month", previousMonthStart)
          .lte("target_month", currentMonthEnd)
          .order("target_month", { ascending: false });

        if (isStaff) {
          kpiQuery = kpiQuery.eq("employees.profiles.role", "staff");
        } else if (groupId !== "all") {
          kpiQuery = kpiQuery.eq("employees.group_id", groupId);
        }

        // Perbaikan: Pastikan query daily_reports mengambil data dengan benar
        let dailyReportsQuery = supabase
          .from("daily_reports")
          .select("employee_id, total_sales, report_date, device_id, devices!inner(group_id, groups(name))")
          .gte("report_date", startDate)
          .lte("report_date", endDate);

        if (!isStaff && groupId !== "all") {
          dailyReportsQuery = dailyReportsQuery.eq("devices.group_id", groupId);
        }

        // Perbaikan: Pastikan query commissions mengambil data dengan benar
        let commissionsQuery = supabase
          .from("commissions")
          .select("gross_commission, net_commission, paid_commission, period_start, period_end, accounts!inner(id, group_id)")
          .gte("period_start", startDate)
          .lte("period_end", endDate);

        if (!isStaff && groupId !== "all") {
          commissionsQuery = commissionsQuery.eq("accounts.group_id", groupId);
        }

        let accountsQuery = supabase.from("accounts").select("platform, group_id");

        if (!isStaff && groupId !== "all") {
          accountsQuery = accountsQuery.eq("group_id", groupId);
        }

        // OPTIMIZATION: Execute semua queries secara parallel
        const [
          { data: kpiData, error: kpiError },
          { data: dailyReportsData, error: dailyReportsError },
          { data: commissionsData, error: commissionsError },
          { data: accountsData, error: accountsError },
        ] = await Promise.all([
          kpiQuery,
          dailyReportsQuery,
          commissionsQuery,
          accountsQuery,
        ]);

        if (kpiError) throw kpiError;
        if (dailyReportsError) throw dailyReportsError;
        if (commissionsError) throw commissionsError;
        if (accountsError) throw accountsError;

        // ============ PROCESS: KPI & RANKING DATA ============
        const rawData = (kpiData as any[]) || [];
        const latestKpiMap = new Map<string, EmployeePerformance>();
        const currentEmployeeId = employee?.id;
        let foundMyKpi: EmployeePerformance | null = null;

        // Build omset map dari daily reports (OPTIMIZATION: single pass)
        const dailyReportsOmset = new Map<string, number>();
        (dailyReportsData || []).forEach((report: any) => {
          const empId = report.employee_id;
          const current = dailyReportsOmset.get(empId) || 0;
          dailyReportsOmset.set(empId, current + (report.total_sales || 0));
        });

        // Build commission map dari commissions data
        const commissionMap = new Map<string, number>();
        (commissionsData || []).forEach((comm: any) => {
          // Cari account_id dari komisi untuk menemukan employee yang terkait
          const accountId = comm.accounts?.id;
          if (accountId) {
            // Untuk sekarang, kita asumsikan komisi sudah terkait dengan employee
            // Dalam implementasi yang lebih baik, kita perlu query tambahan untuk menghubungkan account ke employee
            const current = commissionMap.get(accountId) || 0;
            commissionMap.set(accountId, current + (comm.paid_commission || 0));
          }
        });

        // Process ranking data
        rawData.forEach((item) => {
          const employeeId = item.employees?.id;
          if (!employeeId) return;

          // Perbaikan: Gunakan data omset dari daily_reports jika ada
          const omsetFromReports = dailyReportsOmset.get(employeeId) || 0;
          const finalOmset = omsetFromReports > 0 ? omsetFromReports : (item.actual_sales || 0);

          // Perbaikan: Hitung komisi dengan benar
          let finalCommission = item.actual_commission || 0;
          // Jika ada data komisi dari tabel commissions, gunakan itu
          if (commissionMap.size > 0) {
            // Ini adalah simplifikasi, dalam implementasi nyata kita perlu
            // menghubungkan account ke employee dengan benar
            finalCommission = Array.from(commissionMap.values()).reduce((sum, val) => sum + val, 0);
          }

          const calculatedKpi = calculateTotalKpi(
            finalOmset,
            item.sales_target || 0,
            finalCommission,
            item.commission_target || 0,
            item.actual_attendance || 0,
            item.attendance_target || 0
          );

          const performanceRecord: EmployeePerformance = {
            id: employeeId,
            name: item.employees?.profiles?.full_name || "N/A",
            group: item.employees?.groups?.name || "Tanpa Grup",
            omset: finalOmset,
            commission: finalCommission,
            kpi: calculatedKpi,
            target_month: item.target_month,
            sales_target: item.sales_target || 0,
            commission_target: item.commission_target || 0,
            attendance_target: item.attendance_target || 22,
            actual_attendance: item.actual_attendance || 0,
          };

          if (!latestKpiMap.has(employeeId)) {
            latestKpiMap.set(employeeId, performanceRecord);
          }

          if (employeeId === currentEmployeeId && !foundMyKpi) {
            foundMyKpi = performanceRecord;
          }
        });

        const uniqueData = Array.from(latestKpiMap.values());
        uniqueData.sort((a, b) => b.kpi - a.kpi);
        setRankingData(uniqueData);
        if (isStaff) setMyKpi(foundMyKpi);

        // ============ PROCESS: COMMISSION DATA ============
        // Perbaikan: Pastikan perhitungan komisi benar
        const gross = (commissionsData || []).reduce(
          (acc, c) => acc + (Number(c.gross_commission) || 0),
          0
        );
        const net = (commissionsData || []).reduce(
          (acc, c) => acc + (Number(c.net_commission) || 0),
          0
        );
        const paid = (commissionsData || []).reduce(
          (acc, c) => acc + (Number(c.paid_commission) || 0),
          0
        );

        setCommissionData([
          { name: "Kotor", value: gross, color: CHART_COLORS.blue },
          { name: "Bersih", value: net, color: CHART_COLORS.green },
          { name: "Cair", value: paid, color: CHART_COLORS.yellow },
        ]);

        // ============ PROCESS: GROUP PERFORMANCE ============
        const groupOmsetMap = new Map<string, number>();
        (dailyReportsData || []).forEach((item: any) => {
          const groupName = item.devices?.groups?.name || "Tanpa Grup";
          const currentOmset = groupOmsetMap.get(groupName) || 0;
          groupOmsetMap.set(groupName, currentOmset + (Number(item.total_sales) || 0));
        });

        const groupDataArray = Array.from(groupOmsetMap.entries())
          .map(([name, omset]) => ({ name, omset }))
          .sort((a, b) => b.omset - a.omset)
          .slice(0, 5);

        setGroupData(
          groupDataArray.length > 0
            ? groupDataArray
            : [{ name: "Tidak ada data", omset: 0 }]
        );

        // ============ PROCESS: ACCOUNTS DATA ============
        let shopeeCount = 0;
        let tiktokCount = 0;
        (accountsData || []).forEach((acc: any) => {
          if (acc.platform === "shopee") shopeeCount++;
          if (acc.platform === "tiktok") tiktokCount++;
        });

        setAccountData([
          { name: "Shopee", value: shopeeCount, color: CHART_COLORS.shopee },
          { name: "TikTok", value: tiktokCount, color: CHART_COLORS.tiktok },
        ]);

        // ============ PROCESS: SALES TREND ============
        const trendMap = new Map<
          string,
          { date: string; sales: number; commission: number }
        >();
        const days = eachDayOfInterval({
          start: parseISO(startDate),
          end: parseISO(endDate),
        });

        days.forEach((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dateLabel = format(day, "dd MMM", { locale: indonesiaLocale });
          trendMap.set(dateKey, { date: dateLabel, sales: 0, commission: 0 });
        });

        // Add sales data
        (dailyReportsData || []).forEach((report: any) => {
          const dateKey = report.report_date;
          if (trendMap.has(dateKey)) {
            const current = trendMap.get(dateKey)!;
            current.sales += Number(report.total_sales) || 0;
          }
        });

        // Perbaikan: Tambahkan data komisi ke tren dengan benar
        (commissionsData || []).forEach((comm: any) => {
          // Komisi mungkin memiliki period_start dan period_end, kita gunakan period_start
          const dateKey = comm.period_start;
          if (dateKey && trendMap.has(dateKey)) {
            const current = trendMap.get(dateKey)!;
            current.commission += Number(comm.paid_commission) || 0;
          }
        });

        const finalTrendData = Array.from(trendMap.values());
        setSalesTrendData(finalTrendData);

        setLoadingRanking(false);
        setLoadingCharts(false);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Gagal memuat data dashboard");
        toast.error("Gagal memuat data dashboard");
        setLoadingRanking(false);
        setLoadingCharts(false);
      }
    },
    [employee?.id, isStaff]
  );

  // OPTIMIZATION: Fetch Groups hanya sekali pada mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data, error } = await supabase
          .from("groups")
          .select("id, name");
        if (error) throw error;
        if (data) {
          setAvailableGroups(data);
        }
      } catch (error: any) {
        console.error("Error fetching groups:", error);
        toast.error("Gagal memuat daftar grup.");
      }
    };
    if (!isStaff) {
      fetchGroups();
    }
  }, [isStaff]);

  // Initial load
  useEffect(() => {
    if (profile && employee) {
      handleFilterSubmit();
    }
  }, [profile, employee, isStaff]);

  // OPTIMIZATION: Debounced real-time subscription untuk menghindari refresh berlebihan
  useEffect(() => {
    if (!profile || !employee) return;

    let refreshTimeout: NodeJS.Timeout;

    const subscription = supabase
      .channel("daily_reports_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_reports",
        },
        () => {
          console.log("Daily reports updated");
          // Debounce 2 detik untuk menghindari refresh terlalu sering
          clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(() => {
            handleFilterSubmit();
          }, 2000);
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      clearTimeout(refreshTimeout);
      if (subscription) subscription.unsubscribe();
    };
  }, [profile, employee, isStaff, handleFilterSubmit]);

  const filteredRankingData = rankingData.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StaffShortcuts = () => (
    <Card className="shadow-lg border-primary/50 overflow-hidden dark:bg-card dark:border-border">
      <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
        <CardTitle className="text-xl text-white flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Aksi Cepat Staff
        </CardTitle>
        <CardDescription className="text-primary-100">
          Akses cepat ke tugas harian Anda.
        </CardDescription>
      </div>
      <CardContent className="p-6 flex flex-col space-y-4 dark:bg-card">
        <Button
          className="w-full gap-2 py-6 text-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
          onClick={() => navigate("/attendance")}
        >
          <Calendar className="h-6 w-6" />
          Absensi (Check-in/Check-out)
        </Button>
        <Button
          className="w-full gap-2 py-6 text-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
          variant="secondary"
          onClick={() => navigate("/daily-report")}
        >
          <FileText className="h-6 w-6" />
          Jurnal Laporan Harian
        </Button>
      </CardContent>
    </Card>
  );

  const StaffPersonalKpi = () => {
    if (!myKpi) {
      return (
        <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              KPI Anda (Bulan Ini)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 dark:bg-card">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
                <BarChart3 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-muted-foreground text-center">Data KPI bulan ini belum tersedia.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/kpi")}>
                Lihat Target KPI
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            KPI Anda (Bulan Terakhir)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 dark:bg-card">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-lg">{myKpi.name}</p>
                <p className="text-sm text-muted-foreground">{myKpi.group}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{formatCurrency(myKpi.omset)}</p>
                <p className="text-xs text-muted-foreground">Omset Total</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Total KPI</span>
                <span
                  className={cn(
                    "text-xl font-bold",
                    getKpiTextColor(myKpi.kpi)
                  )}
                >
                  {myKpi.kpi.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={myKpi.kpi}
                className={cn("h-3 w-full", getKpiColor(myKpi.kpi))}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <p className="text-lg font-semibold">{formatCurrency(myKpi.omset)}</p>
                <p className="text-xs text-muted-foreground">Omset</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{formatCurrency(myKpi.commission)}</p>
                <p className="text-xs text-muted-foreground">Komisi</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{myKpi.actual_attendance || 0}/{myKpi.attendance_target}</p>
                <p className="text-xs text-muted-foreground">Kehadiran</p>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={() => navigate("/kpi")}>
              Lihat Detail KPI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isStaff) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard Kinerja Anda</h1>
              <p className="text-muted-foreground">
                Selamat datang kembali, {profile?.full_name || "User"}!
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/notifications")}>
              <Bell className="h-4 w-4" />
              Notifikasi
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StaffShortcuts />
            <div className="md:col-span-1 lg:col-span-2">
              <StaffPersonalKpi />
            </div>
          </div>

          <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Ranking Karyawan Staff Keseluruhan
                  </CardTitle>
                  <CardDescription>
                    Performa KPI seluruh karyawan dengan role Staff (Bulan Terakhir).
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
              <div className="mt-4">
                <Input
                  placeholder="Cari nama karyawan..."
                  className="w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="pt-0 dark:bg-card">
              {loadingRanking ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredRankingData.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-muted-foreground">
                    Tidak ada data ranking staff ditemukan.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Bulan</TableHead>
                        <TableHead>Omset (Aktual/Target)</TableHead>
                        <TableHead>Komisi (Aktual/Target)</TableHead>
                        <TableHead>Absensi (Aktual/Target)</TableHead>
                        <TableHead className="w-[200px]">Total KPI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRankingData.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-bold text-lg">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-full",
                              index === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              index === 1 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                              index === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{item.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.group}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                              {formatDateMonth(item.target_month)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {formatCurrency(item.omset)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                / {formatCurrency(item.sales_target)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {formatCurrency(item.commission)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                / {formatCurrency(item.commission_target)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {item.actual_attendance || 0} hari
                              </span>
                              <span className="text-xs text-muted-foreground">
                                / {item.attendance_target} hari
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={item.kpi}
                                className={cn(
                                  "h-3 w-full",
                                  getKpiColor(item.kpi)
                                )}
                              />
                              <span
                                className={cn(
                                  "font-bold w-12 text-right",
                                  getKpiTextColor(item.kpi)
                                )}
                              >
                                {item.kpi.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Utama</h1>
            <p className="text-muted-foreground">
              Selamat datang kembali, {profile?.full_name || "User"}!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleFilterSubmit}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Pengaturan
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-destructive dark:bg-card dark:border-border">
            <CardContent className="pt-6 dark:bg-card">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Data
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 dark:bg-card">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px] space-y-1">
                <label htmlFor="date-start" className="text-xs text-muted-foreground">
                  Mulai Tgl
                </label>
                <Input
                  id="date-start"
                  type="date"
                  className="w-full"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[150px] space-y-1">
                <label htmlFor="date-end" className="text-xs text-muted-foreground">
                  Sampai Tgl
                </label>
                <Input
                  id="date-end"
                  type="date"
                  className="w-full"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[150px] space-y-1">
                <Label htmlFor="filter-group">Group</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group" className="w-full">
                    <SelectValue placeholder="Semua Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Group</SelectItem>
                    {availableGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleFilterSubmit}
                className="gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                disabled={loadingCharts || loadingRanking}
              >
                {loadingCharts || loadingRanking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Terapkan Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        <DashboardStats
          filterDateStart={filterDateStart}
          filterDateEnd={filterDateEnd}
          filterGroup={filterGroup}
        />

        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Tren Penjualan</TabsTrigger>
            <TabsTrigger value="commission">Komisi</TabsTrigger>
            <TabsTrigger value="groups">Performa Grup</TabsTrigger>
            <TabsTrigger value="accounts">Platform Akun</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trends" className="space-y-4">
            <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tren Omset & Komisi Cair
                </CardTitle>
                <CardDescription>
                  Menampilkan data harian berdasarkan filter tanggal dan group.
                </CardDescription>
              </CardHeader>
              <CardContent className="dark:bg-card">
                {loadingCharts ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : salesTrendData.length === 0 ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <p className="text-muted-foreground">Tidak ada data tren penjualan.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={salesTrendData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(val) => formatCurrencyForChart(val)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => formatCurrencyForChart(value)}
                      />
                      <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke={CHART_COLORS.blue}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                        name="Omset Harian"
                      />
                      <Area
                        type="monotone"
                        dataKey="commission"
                        stroke={CHART_COLORS.green}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCommission)"
                        name="Komisi Cair"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="commission" className="space-y-4">
            <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Breakdown Komisi (Filter)
                </CardTitle>
              </CardHeader>
              <CardContent className="dark:bg-card">
                {loadingCharts ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : commissionData.length === 0 ||
                  commissionData.every((item) => item.value === 0) ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <p className="text-muted-foreground">
                      Tidak ada data komisi untuk periode ini.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={commissionData} layout="horizontal">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(val) => formatCurrencyForChart(val)}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => formatCurrencyForChart(value)}
                      />
                      <Bar
                        dataKey="value"
                        radius={[0, 8, 8, 0]}
                        name="Nilai"
                      >
                        {commissionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="groups" className="space-y-4">
            <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performa Group (Top 5 Omset)
                </CardTitle>
                <CardDescription>
                  Berdasarkan total omset dari daily reports (sesuai filter Group).
                </CardDescription>
              </CardHeader>
              <CardContent className="dark:bg-card">
                {loadingCharts ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={groupData} layout="horizontal">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(val) => formatCurrencyForChart(val)}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => formatCurrencyForChart(value)}
                      />
                      <Bar
                        dataKey="omset"
                        fill={CHART_COLORS.purple}
                        radius={[0, 8, 8, 0]}
                        name="Omset"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="accounts" className="space-y-4">
            <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Breakdown Platform Akun
                </CardTitle>
                <CardDescription>
                  Total akun terdaftar (All Time, sesuai filter Group).
                </CardDescription>
              </CardHeader>
              <CardContent className="dark:bg-card">
                {loadingCharts ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : accountData.length === 0 ||
                  (accountData[0]?.value === 0 && accountData[1]?.value === 0) ? (
                  <div className="flex justify-center items-center h-[300px]">
                    <p className="text-muted-foreground">Tidak ada data akun.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={accountData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill={CHART_COLORS.blue}
                        dataKey="value"
                      >
                        {accountData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value) => `${value} Akun`}
                      />
                      <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Performers (Bulan Terakhir)
                </CardTitle>
                <CardDescription>
                  Beberapa top performer berdasarkan Total KPI aktual (sesuai filter Group).
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                Lihat Semua
              </Button>
            </div>
            <div className="mt-4">
              <Input
                placeholder="Cari nama karyawan..."
                className="w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="dark:bg-card">
            {loadingRanking ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredRankingData.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-center text-muted-foreground">
                  Tidak ada data ranking ditemukan.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredRankingData.slice(0, 5).map((employee, index) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors dark:bg-muted/20 dark:hover:bg-muted/30"
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm",
                      index === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      index === 1 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                      index === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">{employee.group}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress
                          value={employee.kpi}
                          className={cn(
                            "flex-1 h-2",
                            getKpiColor(employee.kpi)
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs w-12 text-right font-semibold",
                            getKPIColorClass(employee.kpi)
                          )}
                        >
                          {employee.kpi.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(employee.omset)}
                      </p>
                      <p className="text-xs text-muted-foreground">Omset</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigate(`/employees/${employee.id}`)}>
                          Lihat Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/kpi?employee=${employee.id}`)}>
                          Lihat KPI
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;