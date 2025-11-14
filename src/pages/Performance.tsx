// src/pages/Performance.tsx
import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator, 
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Download, 
  TrendingUp, 
  Loader2, 
  Eye, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Filter,
  BarChart3,
  Users,
  Target,
  Award,
  Calendar,
  DollarSign,
  Activity,
  RefreshCw,
  FileText,
  UserCheck,
  Medal,
  Star
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

// Import Tipe Data dari Employees & Dialog Detail
import { EmployeeProfile } from "@/pages/Employees"; 
import { EmployeeDetailDialog } from "@/components/Employee/EmployeeDetailDialog";

// Tipe data lokal yang diperluas
interface PerformanceProfile extends EmployeeProfile {
  omset: number; // actual_sales
  commission: number; // actual_commission
  attendance: number; // actual_attendance
  kpi: number; // total_kpi
}

// Tipe data untuk filter group
interface Group {
  id: string;
  name: string;
}

// Kalkulasi KPI
const calculateTotalKpi = (sales: number, sTarget: number, comm: number, cTarget: number, attend: number, aTarget: number) => {
    // Bobot: Omset 50%, Komisi 30%, Absensi 20%
    const sales_pct = (sTarget > 0) ? (sales / sTarget) * 100 : 0;
    const commission_pct = (cTarget > 0) ? (comm / cTarget) * 100 : 0;
    const attendance_pct = (aTarget > 0) ? (attend / aTarget) * 100 : 0;
    
    const total_kpi = (sales_pct * 0.5) + (commission_pct * 0.3) + (attendance_pct * 0.2);
    
    return Math.min(total_kpi, 100);
};

const Performance = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [filterMonth, setFilterMonth] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterGroup, setFilterGroup] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  
  const [summary, setSummary] = useState({
    totalOmset: 0,
    totalCommission: 0,
    avgKpi: 0
  });
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PerformanceProfile | null>(null);

  const { exportToPDF, exportToCSV, isExporting } = useExport();
  
  const canRead = profile?.role !== "staff" && profile?.role !== "viewer"; 

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600">
          <Medal className="h-5 w-5" />
        </div>;
      case 2:
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600">
          <Medal className="h-5 w-5" />
        </div>;
      case 3:
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600">
          <Medal className="h-5 w-5" />
        </div>;
      default:
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold">
          {rank}
        </div>;
    }
  };
  
  const fetchData = useCallback(async (month: string, groupId: string) => {
    setLoading(true);
    if (!profile || !canRead) {
        setLoading(false);
        return;
    }
    
    try {
        // Hitung rentang tanggal dari bulan yang dipilih
        const monthDate = parseISO(month);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const startDate = format(monthStart, "yyyy-MM-dd");
        const endDate = format(monthEnd, "yyyy-MM-dd");

        // 1. Fetch KPI targets data
        let query = supabase
            .from('kpi_targets')
            .select(`
                id,
                sales_target,
                commission_target,
                attendance_target,
                actual_sales,
                actual_commission,
                actual_attendance,
                employees!inner (
                    id,
                    profile_id,
                    group_id,
                    position,
                    profiles ( full_name, email, phone, avatar_url, role, status, date_of_birth, address ),
                    groups ( name )
                ),
                target_month
            `)
            .eq('target_month', month); 
            
        if (groupId !== "all") {
            query = query.eq('employees.group_id', groupId);
        }

        const { data: kpiResults, error: kpiError } = await query;

        if (kpiError) throw kpiError;
        
        const rawData = kpiResults as any[];

        // 2. Fetch omset real-time dari daily_reports untuk bulan yang dipilih
        // Ambil employee IDs dari kpiResults untuk filter
        const employeeIds = rawData.map(item => item.employees?.id).filter(Boolean) as string[];
        
        let dailyReportsQuery = supabase
            .from('daily_reports')
            .select('employee_id, total_sales, report_date, devices!inner(group_id)')
            .gte('report_date', startDate)
            .lte('report_date', endDate);

        // Filter berdasarkan group jika diperlukan (melalui devices)
        if (groupId !== "all") {
            dailyReportsQuery = dailyReportsQuery.eq('devices.group_id', groupId);
        }

        const { data: dailyReportsData, error: dailyReportsError } = await dailyReportsQuery;
        
        if (dailyReportsError) {
            console.warn("Error fetching daily reports:", dailyReportsError);
        }

        // 3. Hitung total omset per employee dari daily_reports
        const omsetMap = new Map<string, number>();
        if (dailyReportsData && employeeIds.length > 0) {
            dailyReportsData.forEach((report: any) => {
                const empId = report.employee_id;
                // Hanya hitung jika employee ada di kpiResults (sudah terfilter group)
                if (employeeIds.includes(empId)) {
                    const current = omsetMap.get(empId) || 0;
                    omsetMap.set(empId, current + (report.total_sales || 0));
                }
            });
        }

        // 4. Map data dan gunakan omset dari daily_reports jika tersedia
        const mappedData: PerformanceProfile[] = rawData.map((item) => {
             const emp = item.employees;
             const prof = emp.profiles;
             
             // Gunakan omset dari daily_reports jika tersedia, fallback ke actual_sales
             const omsetFromReports = omsetMap.get(emp.id) || 0;
             const finalOmset = omsetFromReports > 0 ? omsetFromReports : (item.actual_sales || 0);
             
             const calculatedKpi = calculateTotalKpi(
                finalOmset, item.sales_target,
                item.actual_commission || 0, item.commission_target,
                item.actual_attendance || 0, item.attendance_target
            );
            
             return {
                // EmployeeProfile fields
                id: emp.id,
                profile_id: emp.profile_id,
                full_name: prof?.full_name || "N/A",
                email: prof?.email || "N/A",
                role: prof?.role || "viewer",
                phone: prof?.phone || null,
                avatar_url: prof?.avatar_url || null,
                status: prof?.status || "active",
                position: emp.position || null,
                group_name: emp.groups?.name || "N/A",
                group_id: emp.group_id || null,
                date_of_birth: prof?.date_of_birth || null,
                address: prof?.address || null,
                
                // PerformanceProfile fields - menggunakan omset dari daily_reports
                omset: finalOmset,
                commission: item.actual_commission || 0,
                attendance: item.actual_attendance || 0,
                kpi: calculatedKpi,
            };
        });

        mappedData.sort((a, b) => b.kpi - a.kpi);
        setPerformanceData(mappedData);

    } catch (error: any) {
        toast.error("Gagal memuat data Performance: " + error.message);
        console.error(error);
    } finally {
        setLoading(false);
    }
  }, [profile, canRead]);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data, error } = await supabase.from("groups").select("id, name");
      if (error) {
        toast.error("Gagal memuat daftar grup");
      } else {
        setAvailableGroups(data || []);
      }
    };
    
    if (profile) {
      fetchGroups();
      fetchData(filterMonth, filterGroup);
    }
  }, [profile, filterMonth, filterGroup, fetchData]);
  
  const filteredData = performanceData.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    const totalOmset = filteredData.reduce((sum, e) => sum + e.omset, 0);
    const totalCommission = filteredData.reduce((sum, e) => sum + e.commission, 0);
    const avgKpi = filteredData.length > 0 
      ? filteredData.reduce((sum, e) => sum + e.kpi, 0) / filteredData.length 
      : 0;
      
    setSummary({
      totalOmset,
      totalCommission,
      avgKpi
    });
  }, [filteredData]);
  
  
  const handleExport = (type: 'pdf' | 'csv') => {
    const columns = [
      { header: 'Rank', dataKey: 'rank' },
      { header: 'Nama', dataKey: 'full_name' },
      { header: 'Group', dataKey: 'group_name' },
      { header: 'Total Omset', dataKey: 'omsetFormatted' },
      { header: 'Komisi (Aktual)', dataKey: 'commissionFormatted' },
      { header: 'Absensi', dataKey: 'attendanceFormatted' },
      { header: 'KPI %', dataKey: 'kpiFormatted' },
    ];
    
    const exportData = filteredData.map((item, index) => ({
      ...item,
      rank: `#${index + 1}`,
      omsetFormatted: formatCurrency(item.omset),
      commissionFormatted: formatCurrency(item.commission),
      attendanceFormatted: `${item.attendance} hari`,
      kpiFormatted: `${item.kpi.toFixed(1)}%`
    }));

    const formattedMonth = format(parseISO(filterMonth), "MMMM yyyy", { locale: indonesiaLocale });

    const options = {
        filename: `Laporan_Performa_Tim_${formattedMonth}`,
        title: `Laporan Performa Tim - ${formattedMonth}`,
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else {
        exportToCSV(options);
    }
  };
  
  const handleOpenDetail = (employee: PerformanceProfile) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(true);
  };
  
  const closeAllModals = () => {
    setIsDetailOpen(false);
    setSelectedEmployee(null);
  };


  if (!canRead && !loading) {
    return (
      <MainLayout>
        <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)]">
             <h1 className="text-2xl font-bold">Akses Ditolak</h1>
             <p className="text-muted-foreground">Anda tidak memiliki izin untuk melihat halaman ini.</p>
        </div>
      </MainLayout>
    );
  }


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Performa Tim & Individu</h1>
            <p className="text-muted-foreground">
              Lacak dan analisis metrik performa tim.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchData(filterMonth, filterGroup)}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={isExporting || filteredData.length === 0}>
                      <Download className="h-4 w-4" />
                      {isExporting ? 'Mengekspor...' : 'Export'}
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
                      Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
                      Export CSV
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Data
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-month">Bulan Target</Label>
                <Input
                  id="filter-month"
                  type="month"
                  value={format(parseISO(filterMonth), "yyyy-MM")} 
                  onChange={(e) => setFilterMonth(format(parseISO(e.target.value), "yyyy-MM-dd"))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-group">Group</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group">
                    <SelectValue placeholder="Pilih Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Group</SelectItem>
                    {availableGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-employee">Cari Karyawan</Label>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search-employee"
                      placeholder="Cari nama atau grup..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Omset Tim
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                 {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(summary.totalOmset)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Berdasarkan filter aktif</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-green-100">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Komisi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(summary.totalCommission)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Berdasarkan filter aktif</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-purple-100">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Karyawan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : performanceData.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total karyawan (sesuai filter)</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-orange-100">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Rata-rata KPI Tim
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className={cn("text-2xl font-bold", getKPIColor(summary.avgKpi))}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${summary.avgKpi.toFixed(1)}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pencapaian rata-rata</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="table" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="table">Tabel Performa</TabsTrigger>
            <TabsTrigger value="top-omset">Top Omset</TabsTrigger>
            <TabsTrigger value="top-kpi">Top KPI</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="space-y-4">
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Ranking Karyawan
                </CardTitle>
                <CardDescription>
                  Menampilkan data performa berdasarkan filter yang dipilih.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {loading ? (
                     <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     </div>
                 ) : (
                    <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rank</TableHead>
                              <TableHead>Nama</TableHead>
                              <TableHead>Group</TableHead>
                              <TableHead className="text-right">Total Omset</TableHead>
                              <TableHead className="text-right">Komisi (Aktual)</TableHead>
                              <TableHead className="text-center">Absensi</TableHead>
                              <TableHead className="text-center">KPI %</TableHead>
                              <TableHead className="text-center">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        {searchTerm ? "Karyawan tidak ditemukan." : "Tidak ada data performa untuk filter ini."}
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredData.map((employee, index) => (
                              <TableRow key={employee.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="font-medium">
                                  {getRankIcon(index + 1)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={employee.avatar_url || undefined} alt={employee.full_name} />
                                      <AvatarFallback>{employee.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{employee.full_name}</p>
                                      <p className="text-xs text-muted-foreground">{employee.position}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{employee.group_name}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(employee.omset)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(employee.commission)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <span>{employee.attendance} hari</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={`font-bold ${getKPIColor(employee.kpi)}`}>
                                      {employee.kpi.toFixed(1)}%
                                    </span>
                                    <Progress value={employee.kpi} className="w-16 h-1.5" />
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenDetail(employee)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Lihat Detail Performa
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
          
          <TabsContent value="top-omset" className="space-y-4">
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Top Performers - Omset
                </CardTitle>
                <CardDescription>
                  Karyawan dengan omset tertinggi berdasarkan filter yang dipilih.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-muted-foreground">Tidak ada data untuk ditampilkan.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredData
                      .sort((a, b) => b.omset - a.omset)
                      .slice(0, 10)
                      .map((employee, index) => (
                        <div key={employee.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          {getRankIcon(index + 1)}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={employee.avatar_url || undefined} alt={employee.full_name} />
                                <AvatarFallback>{employee.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.full_name}</p>
                                <p className="text-sm text-muted-foreground">{employee.group_name}</p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-muted-foreground">Progress Omset</span>
                                <span className="text-sm font-medium">{formatCurrency(employee.omset)}</span>
                              </div>
                              <Progress 
                                value={(employee.omset / (summary.totalOmset || 1)) * 100} 
                                className="h-2" 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="top-kpi" className="space-y-4">
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Top Performers - KPI
                </CardTitle>
                <CardDescription>
                  Karyawan dengan KPI tertinggi berdasarkan filter yang dipilih.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-muted-foreground">Tidak ada data untuk ditampilkan.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredData
                      .slice(0, 10)
                      .map((employee, index) => (
                        <div key={employee.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          {getRankIcon(index + 1)}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={employee.avatar_url || undefined} alt={employee.full_name} />
                                <AvatarFallback>{employee.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.full_name}</p>
                                <p className="text-sm text-muted-foreground">{employee.group_name}</p>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-4">
                              <div>
                                <span className="text-sm text-muted-foreground">Omset</span>
                                <p className="font-medium">{formatCurrency(employee.omset)}</p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Komisi</span>
                                <p className="font-medium">{formatCurrency(employee.commission)}</p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">KPI</span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold ${getKPIColor(employee.kpi)}`}>
                                    {employee.kpi.toFixed(1)}%
                                  </span>
                                  <Progress value={employee.kpi} className="flex-1 h-2" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* --- RENDER MODAL DETAIL --- */}
      {selectedEmployee && (
        <EmployeeDetailDialog
          isOpen={isDetailOpen}
          onClose={closeAllModals}
          employee={selectedEmployee}
        />
      )}
      
    </MainLayout>
  );
};

export default Performance;