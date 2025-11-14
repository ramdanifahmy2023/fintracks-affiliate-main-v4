// src/pages/GroupDetails.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, subMonths } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
// Perbaikan: Tambahkan import DropdownMenu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  ArrowLeft,
  Users,
  Smartphone,
  UserCircle,
  TrendingUp,
  Shield,
  DollarSign,
  Target,
  Calendar,
  Building,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Download,
  Settings,
  Mail,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";

// Detail Grup
interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  profiles: {
    full_name: string;
    avatar_url?: string;
  } | null;
  created_at?: string;
}

// Tipe untuk Anggota
interface GroupEmployee {
  id: string;
  position: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email: string;
    role: string;
    phone?: string;
    address?: string;
  };
}

// Tipe untuk Device
interface GroupDevice {
  id: string;
  device_id: string;
  imei: string;
  google_account: string | null;
  purchase_date?: string;
  purchase_price?: number;
}

// Tipe untuk Akun
interface GroupAccount {
  id: string;
  platform: "shopee" | "tiktok";
  username: string;
  email: string;
  account_status: string | null;
  created_at?: string;
}

// Tipe untuk Performa
interface EmployeePerformance {
  id: string;
  name: string;
  omset: number;
  commission: number;
  attendance: number;
  kpi: number;
  position?: string;
  avatar_url?: string;
}

const calculateTotalKpi = (sales: number, sTarget: number, comm: number, cTarget: number, attend: number, aTarget: number) => {
  const sales_pct = (sTarget > 0) ? (sales / sTarget) * 100 : 0;
  const commission_pct = (cTarget > 0) ? (comm / cTarget) * 100 : 0;
  const attendance_pct = (aTarget > 0) ? (attend / aTarget) * 100 : 0;
  const total_kpi = (sales_pct * 0.5) + (commission_pct * 0.3) + (attendance_pct * 0.2);
  return Math.min(total_kpi, 100);
};

const getKPIColor = (kpi: number) => {
  if (kpi >= 90) return "text-success";
  if (kpi >= 70) return "text-warning";
  return "text-destructive";
};

const getKpiBgColor = (kpi: number) => {
  if (kpi >= 90) return "bg-success";
  if (kpi >= 70) return "bg-warning";
  return "bg-destructive";
};

const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
};

const GroupDetails = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));

  // State untuk data
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [employees, setEmployees] = useState<GroupEmployee[]>([]);
  const [devices, setDevices] = useState<GroupDevice[]>([]);
  const [accounts, setAccounts] = useState<GroupAccount[]>([]);
  const [performance, setPerformance] = useState<EmployeePerformance[]>([]);
  const [summary, setSummary] = useState({ totalOmset: 0, avgKpi: 0 });

  const { exportToPDF, exportToCSV, isExporting } = useExport();

  const getAvatarFallback = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };
  
  const getAccountStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success">Aktif</Badge>;
      case "banned_temporary":
        return <Badge variant="secondary">Banned Sementara</Badge>;
      case "banned_permanent":
        return <Badge variant="destructive">Banned Permanen</Badge>;
      default:
        return <Badge variant="outline">{status || "N/A"}</Badge>;
    }
  };

  const fetchData = useCallback(async () => {
    if (!profile || !groupId) return;
    setLoading(true);

    try {
      // 1. Fetch Detail Grup
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select(`
          id, name, description, leader_id, created_at,
          profiles ( full_name, avatar_url )
        `)
        .eq("id", groupId)
        .single();
      if (groupError) throw groupError;
      setGroupDetails(groupData);

      // 2. Fetch Anggota Tim
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select(`
          id, position,
          profiles ( full_name, avatar_url, email, role, phone, address )
        `)
        .eq("group_id", groupId);
      if (empError) throw empError;
      setEmployees(empData as any);

      // 3. Fetch Devices
      const { data: devData, error: devError } = await supabase
        .from("devices")
        .select(`id, device_id, imei, google_account, purchase_date, purchase_price`)
        .eq("group_id", groupId);
      if (devError) throw devError;
      setDevices(devData);

      // 4. Fetch Akun
      const { data: accData, error: accError } = await supabase
        .from("accounts")
        .select(`id, platform, username, email, account_status, created_at`)
        .eq("group_id", groupId);
      if (accError) throw accError;
      setAccounts(accData as any);

      // 5. Fetch Performa (KPI Karyawan di grup ini)
      const { data: kpiData, error: kpiError } = await supabase
        .from("kpi_targets")
        .select(`
          sales_target, commission_target, attendance_target,
          actual_sales, actual_commission, actual_attendance,
          employees!inner (
            id,
            group_id,
            position,
            profiles ( full_name, avatar_url )
          )
        `)
        .eq("employees.group_id", groupId)
        .eq("target_month", selectedMonth);
        
      if (kpiError) throw kpiError;
      
      const mappedPerformance: EmployeePerformance[] = (kpiData as any[]).map(item => ({
        id: item.employees.id,
        name: item.employees.profiles.full_name,
        position: item.employees.position,
        avatar_url: item.employees.profiles.avatar_url,
        omset: item.actual_sales || 0,
        commission: item.actual_commission || 0,
        attendance: item.actual_attendance || 0,
        kpi: calculateTotalKpi(
          item.actual_sales || 0, item.sales_target,
          item.actual_commission || 0, item.commission_target,
          item.actual_attendance || 0, item.attendance_target
        )
      })).sort((a, b) => b.kpi - a.kpi);
      
      setPerformance(mappedPerformance);
      
      // Hitung Summary Performa
      const totalOmset = mappedPerformance.reduce((sum, e) => sum + e.omset, 0);
      const avgKpi = mappedPerformance.length > 0 
        ? mappedPerformance.reduce((sum, e) => sum + e.kpi, 0) / mappedPerformance.length 
        : 0;
      setSummary({ totalOmset, avgKpi });

    } catch (error: any) {
      toast.error("Gagal memuat detail grup", { description: error.message });
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, groupId, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleExport = (type: 'pdf' | 'csv', dataType: 'performance' | 'employees' | 'devices' | 'accounts') => {
    let columns, data, filename, title;
    
    switch (dataType) {
      case 'performance':
        columns = [
          { header: 'Nama', dataKey: 'name' },
          { header: 'Posisi', dataKey: 'position' },
          { header: 'Omset', dataKey: 'omsetFormatted' },
          { header: 'Komisi', dataKey: 'commissionFormatted' },
          { header: 'Kehadiran', dataKey: 'attendanceFormatted' },
          { header: 'KPI %', dataKey: 'kpiFormatted' },
        ];
        data = performance.map((item, index) => ({
          ...item,
          rank: `#${index + 1}`,
          position: item.position || '-',
          omsetFormatted: formatCurrency(item.omset),
          commissionFormatted: formatCurrency(item.commission),
          attendanceFormatted: `${item.attendance} hari`,
          kpiFormatted: `${item.kpi.toFixed(1)}%`
        }));
        filename = `Laporan_Performa_${groupDetails?.name}_${format(new Date(selectedMonth), "MMM_yyyy")}`;
        title = `Laporan Performa Group ${groupDetails?.name} - ${format(new Date(selectedMonth), "MMMM yyyy", { locale: indonesiaLocale })}`;
        break;
        
      case 'employees':
        columns = [
          { header: 'Nama', dataKey: 'full_name' },
          { header: 'Posisi', dataKey: 'position' },
          { header: 'Email', dataKey: 'email' },
          { header: 'No. HP', dataKey: 'phone' },
          { header: 'Alamat', dataKey: 'address' },
          { header: 'Role', dataKey: 'role' },
        ];
        data = employees.map(emp => ({
          ...emp,
          position: emp.position || '-',
          phone: emp.profiles.phone || '-',
          address: emp.profiles.address || '-',
          full_name: emp.profiles.full_name,
          email: emp.profiles.email,
          role: emp.profiles.role,
        }));
        filename = `Daftar_Karyawan_${groupDetails?.name}`;
        title = `Daftar Karyawan Group ${groupDetails?.name}`;
        break;
        
      case 'devices':
        columns = [
          { header: 'Device ID', dataKey: 'device_id' },
          { header: 'IMEI', dataKey: 'imei' },
          { header: 'Akun Google', dataKey: 'google_account' },
          { header: 'Tanggal Pembelian', dataKey: 'purchase_date_formatted' },
          { header: 'Harga Pembelian', dataKey: 'purchase_price_formatted' },
        ];
        data = devices.map(dev => ({
          ...dev,
          purchase_date_formatted: dev.purchase_date ? format(new Date(dev.purchase_date), "dd MMM yyyy", { locale: indonesiaLocale }) : '-',
          purchase_price_formatted: dev.purchase_price ? formatCurrency(dev.purchase_price) : '-',
        }));
        filename = `Daftar_Device_${groupDetails?.name}`;
        title = `Daftar Device Group ${groupDetails?.name}`;
        break;
        
      case 'accounts':
        columns = [
          { header: 'Platform', dataKey: 'platform' },
          { header: 'Username', dataKey: 'username' },
          { header: 'Email', dataKey: 'email' },
          { header: 'Status', dataKey: 'account_status' },
          { header: 'Tanggal Dibuat', dataKey: 'created_at_formatted' },
        ];
        data = accounts.map(acc => ({
          ...acc,
          created_at_formatted: acc.created_at ? format(new Date(acc.created_at), "dd MMM yyyy", { locale: indonesiaLocale }) : '-',
        }));
        filename = `Daftar_Akun_${groupDetails?.name}`;
        title = `Daftar Akun Group ${groupDetails?.name}`;
        break;
    }

    const options = {
      filename,
      title,
      data,
      columns,
    };
    
    if (type === 'pdf') {
      exportToPDF(options);
    } else {
      exportToCSV(options);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!groupDetails) {
    return (
      <MainLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Grup Tidak Ditemukan</h1>
          <Button asChild variant="link">
            <Link to="/groups"><ArrowLeft className="h-4 w-4 mr-2" />Kembali ke Daftar Grup</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/groups">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Semua Grup
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Header Grup */}
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-3xl">{groupDetails.name}</CardTitle>
                <CardDescription className="mt-2">{groupDetails.description || "Tidak ada deskripsi."}</CardDescription>
                <div className="flex items-center gap-4 mt-4">
                  <Badge variant="secondary" className="gap-2">
                    <Users className="h-4 w-4" />
                    Leader: {groupDetails.profiles?.full_name || "Belum Ditentukan"}
                  </Badge>
                  {groupDetails.created_at && (
                    <Badge variant="outline" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Dibuat: {format(new Date(groupDetails.created_at), "dd MMM yyyy", { locale: indonesiaLocale })}
                    </Badge>
                  )}
                </div>
              </div>
              {groupDetails.profiles && (
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={groupDetails.profiles.avatar_url || ""} />
                    <AvatarFallback className="text-xl">
                      {getAvatarFallback(groupDetails.profiles.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-lg">{groupDetails.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">Group Leader</p>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Karyawan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{employees.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Anggota tim</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-green-100">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Omset
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatCurrency(summary.totalOmset)}</div>
              <p className="text-xs text-muted-foreground mt-1">Bulan {format(new Date(selectedMonth), "MMM yyyy", { locale: indonesiaLocale })}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-purple-100">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Rata-rata KPI
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className={cn("text-2xl font-bold", getKPIColor(summary.avgKpi))}>
                {summary.avgKpi.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pencapaian rata-rata tim</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-orange-100">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Aktivitas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{devices.length + accounts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Device & Akun</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="performance">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <TabsList className="grid w-full md:w-auto grid-cols-4">
              <TabsTrigger value="performance"><TrendingUp className="h-4 w-4 mr-2"/>Performa</TabsTrigger>
              <TabsTrigger value="employees"><Users className="h-4 w-4 mr-2"/>Anggota Tim</TabsTrigger>
              <TabsTrigger value="devices"><Smartphone className="h-4 w-4 mr-2"/>Devices</TabsTrigger>
              <TabsTrigger value="accounts"><UserCircle className="h-4 w-4 mr-2"/>Akun</TabsTrigger>
            </TabsList>
            
            {performance.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="month-filter">Bulan:</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month-filter" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={format(startOfMonth(new Date()), "yyyy-MM-dd")}>
                      {format(new Date(), "MMMM yyyy", { locale: indonesiaLocale })}
                    </SelectItem>
                    <SelectItem value={format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd")}>
                      {format(subMonths(new Date(), 1), "MMMM yyyy", { locale: indonesiaLocale })}
                    </SelectItem>
                    <SelectItem value={format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd")}>
                      {format(subMonths(new Date(), 2), "MMMM yyyy", { locale: indonesiaLocale })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Tab Performa */}
          <TabsContent value="performance">
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Performa Grup
                    </CardTitle>
                    <CardDescription>
                      Agregat performa KPI dari semua anggota di grup ini untuk bulan {format(new Date(selectedMonth), "MMMM yyyy", { locale: indonesiaLocale })}.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2" disabled={isExporting || performance.length === 0}>
                          <Download className="h-4 w-4" />
                          {isExporting ? 'Mengekspor...' : 'Export'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport('pdf', 'performance')} disabled={isExporting}>
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('csv', 'performance')} disabled={isExporting}>
                          Export CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Omset Grup</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.totalOmset)}</div>
                      <p className="text-xs text-muted-foreground">Bulan {format(new Date(selectedMonth), "MMM yyyy", { locale: indonesiaLocale })}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Rata-rata KPI Grup</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={cn("text-2xl font-bold", getKPIColor(summary.avgKpi))}>
                        {summary.avgKpi.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Pencapaian rata-rata</p>
                    </CardContent>
                  </Card>
                </div>
                
                <h4 className="font-semibold pt-2">Ranking Anggota</h4>
                {performance.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Tidak ada data performa</h3>
                    <p className="text-muted-foreground">Belum ada data KPI untuk bulan {format(new Date(selectedMonth), "MMMM yyyy", { locale: indonesiaLocale })}.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Posisi</TableHead>
                          <TableHead>Omset</TableHead>
                          <TableHead>Komisi</TableHead>
                          <TableHead>Kehadiran</TableHead>
                          <TableHead>KPI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performance.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-bold">#{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={item.avatar_url || ""} />
                                  <AvatarFallback>
                                    {getAvatarFallback(item.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{item.position || "-"}</TableCell>
                            <TableCell>{formatCurrency(item.omset)}</TableCell>
                            <TableCell>{formatCurrency(item.commission)}</TableCell>
                            <TableCell>{item.attendance} hari</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={item.kpi} className={cn("w-20 h-2", getKpiBgColor(item.kpi))} />
                                <span className={cn("font-medium", getKPIColor(item.kpi))}>{item.kpi.toFixed(1)}%</span>
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
          </TabsContent>

          {/* Tab Anggota Tim */}
          <TabsContent value="employees">
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Anggota Tim ({employees.length})
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2" disabled={isExporting || employees.length === 0}>
                          <Download className="h-4 w-4" />
                          {isExporting ? 'Mengekspor...' : 'Export'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport('pdf', 'employees')} disabled={isExporting}>
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('csv', 'employees')} disabled={isExporting}>
                          Export CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Belum ada anggota</h3>
                    <p className="text-muted-foreground">Group ini belum memiliki anggota tim.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Posisi</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>No. HP</TableHead>
                          <TableHead>Alamat</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map(emp => (
                          <TableRow key={emp.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={emp.profiles.avatar_url || ""} />
                                  <AvatarFallback>
                                    {getAvatarFallback(emp.profiles.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{emp.profiles.full_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{emp.position || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate max-w-[200px]">{emp.profiles.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {emp.profiles.phone || "-"}
                            </TableCell>
                            <TableCell>
                              {emp.profiles.address ? (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate max-w-[200px]">{emp.profiles.address}</span>
                                </div>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1.5">
                                <Shield className="h-3.5 w-3.5" />
                                <span className="capitalize">{emp.profiles.role}</span>
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Devices */}
          <TabsContent value="devices">
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Devices ({devices.length})
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2" disabled={isExporting || devices.length === 0}>
                          <Download className="h-4 w-4" />
                          {isExporting ? 'Mengekspor...' : 'Export'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport('pdf', 'devices')} disabled={isExporting}>
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('csv', 'devices')} disabled={isExporting}>
                          Export CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <div className="text-center py-8">
                    <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Belum ada device</h3>
                    <p className="text-muted-foreground">Group ini belum memiliki device terdaftar.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device ID</TableHead>
                          <TableHead>IMEI</TableHead>
                          <TableHead>Akun Google</TableHead>
                          <TableHead>Tanggal Pembelian</TableHead>
                          <TableHead>Harga Pembelian</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.map(dev => (
                          <TableRow key={dev.id}>
                            <TableCell className="font-medium">{dev.device_id}</TableCell>
                            <TableCell className="font-mono text-xs">{dev.imei}</TableCell>
                            <TableCell>{dev.google_account || "-"}</TableCell>
                            <TableCell>
                              {dev.purchase_date ? format(new Date(dev.purchase_date), "dd MMM yyyy", { locale: indonesiaLocale }) : "-"}
                            </TableCell>
                            <TableCell>
                              {dev.purchase_price ? formatCurrency(dev.purchase_price) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Akun */}
          <TabsContent value="accounts">
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5" />
                      Akun Affiliate ({accounts.length})
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2" disabled={isExporting || accounts.length === 0}>
                          <Download className="h-4 w-4" />
                          {isExporting ? 'Mengekspor...' : 'Export'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport('pdf', 'accounts')} disabled={isExporting}>
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('csv', 'accounts')} disabled={isExporting}>
                          Export CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Belum ada akun</h3>
                    <p className="text-muted-foreground">Group ini belum memiliki akun affiliate terdaftar.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Platform</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tanggal Dibuat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.map(acc => (
                          <TableRow key={acc.id}>
                            <TableCell>
                              <Badge 
                                variant={acc.platform === 'shopee' ? 'default' : 'secondary'} 
                                className={cn(
                                  acc.platform === "shopee" ? "bg-[#FF6600] hover:bg-[#FF6600]/90" : "bg-black hover:bg-black/90 text-white"
                                )}
                              >
                                {acc.platform}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{acc.username}</TableCell>
                            <TableCell>{acc.email}</TableCell>
                            <TableCell>{getAccountStatusBadge(acc.account_status)}</TableCell>
                            <TableCell>
                              {acc.created_at ? format(new Date(acc.created_at), "dd MMM yyyy", { locale: indonesiaLocale }) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default GroupDetails;