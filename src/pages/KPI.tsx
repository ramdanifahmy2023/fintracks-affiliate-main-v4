// src/pages/KPI.tsx
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Search, 
  Download, 
  Loader2, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Target,
  TrendingUp,
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  Award,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Medal,
  Square,
  CheckSquare,
  Edit,
  Trash
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { SetTargetDialog } from "@/components/KPI/SetTargetDialog";
import { EditTargetDialog } from "@/components/KPI/EditTargetDialog"; 
import { DeleteTargetAlert } from "@/components/KPI/DeleteTargetAlert"; 

// Tipe data dari Supabase
export type KpiData = {
  id: string;
  employee_id: string; 
  target_month: string;
  sales_target: number;
  commission_target: number;
  attendance_target: number;
  actual_sales: number | null;
  actual_commission: number | null;
  actual_attendance: number | null;
  employees: {
    profiles: {
      full_name: string;
      avatar_url?: string;
    }
  };
};

// Tipe data yang sudah dihitung
type CalculatedKpi = KpiData & {
  sales_pct: number;
  commission_pct: number;
  attendance_pct: number;
  total_kpi: number;
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: KpiData | null;
  delete: KpiData | null;
  bulkDelete: boolean;
  bulkEdit: boolean;
};

const KPI = () => {
  const { profile } = useAuth();
  const [kpiData, setKpiData] = useState<CalculatedKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterStatus, setFilterStatus] = useState("all"); // all, achieved, not-achieved
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
    bulkDelete: false,
    bulkEdit: false,
  });

  // INISIALISASI HOOK EXPORT
  const { exportToPDF, exportToCSV, isExporting } = useExport();

  const canManage = profile?.role === "superadmin" || profile?.role === "leader";
  const canRead = canManage || profile?.role === "admin" || profile?.role === "viewer";
  const canDelete = profile?.role === "superadmin";

  // Helper format
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDateMonth = (dateString: string) => {
    try {
      return format(new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`), "MMM yyyy", { locale: indonesiaLocale });
    } catch (e) { return "-"; }
  }
  
  // --- FUNGSI UTAMA: KALKULASI KPI ---
  const calculateKpi = (data: KpiData[]): CalculatedKpi[] => {
    return data.map(item => {
      // Realisasi (%) = (Aktual / Target) * 100
      const sales_pct = (item.sales_target > 0) ? ((item.actual_sales || 0) / item.sales_target) * 100 : 0;
      const commission_pct = (item.commission_target > 0) ? ((item.actual_commission || 0) / item.commission_target) * 100 : 0;
      const attendance_pct = (item.attendance_target > 0) ? ((item.actual_attendance || 0) / item.attendance_target) * 100 : 0;
      
      // Total KPI = (Omset x 0.5) + (Komisi x 0.3) + (Absensi x 0.2)
      const total_kpi = (sales_pct * 0.5) + (commission_pct * 0.3) + (attendance_pct * 0.2);
      
      return {
        ...item,
        // Cap di 100% untuk Realisasi Individu
        sales_pct: Math.min(sales_pct, 100),
        commission_pct: Math.min(commission_pct, 100),
        attendance_pct: Math.min(attendance_pct, 100),
        // Cap total KPI di 100%
        total_kpi: Math.min(total_kpi, 100), 
      };
    });
  };

  const fetchKpiData = async () => {
    setLoading(true);
    if (!canRead && profile) {
        toast.error("Anda tidak memiliki akses ke halaman ini.");
        setLoading(false);
        return;
    }
    try {
      // Ambil data KPI targets, dan join ke employees (untuk nama)
      const { data, error } = await supabase
        .from("kpi_targets")
        .select(`
          id,
          employee_id,
          target_month,
          sales_target,
          commission_target,
          attendance_target,
          actual_sales,
          actual_commission,
          actual_attendance,
          employees (
            profiles ( full_name, avatar_url )
          )
        `)
        .order("target_month", { ascending: false });

      if (error) throw error;
      
      const calculatedData = calculateKpi(data as any);
      // Urutkan berdasarkan total KPI tertinggi (Ranking)
      calculatedData.sort((a, b) => b.total_kpi - a.total_kpi);
      setKpiData(calculatedData);

    } catch (error: any) {
      toast.error("Gagal memuat data KPI.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) fetchKpiData();
  }, [profile]);
  
  // Helper untuk menentukan warna Progress Bar
  const getKpiColor = (kpi: number) => {
    if (kpi >= 100) return "bg-success";
    if (kpi >= 70) return "bg-warning";
    return "bg-destructive";
  };
  
  // Helper untuk menentukan warna teks KPI
  const getKpiTextColor = (kpi: number) => {
     if (kpi >= 100) return "text-success";
     if (kpi >= 70) return "text-warning";
     return "text-destructive";
  }

  // Helper untuk menentukan ikon status
  const getStatusIcon = (kpi: number) => {
    if (kpi >= 100) return <CheckCircle className="h-4 w-4 text-success" />;
    if (kpi >= 70) return <AlertCircle className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  // Helper untuk menentukan ikon ranking
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
  
  const handleEditClick = (kpi: KpiData) => {
    setDialogs({ ...dialogs, edit: kpi });
  };
  
  const handleDeleteClick = (kpi: KpiData) => {
    setDialogs({ ...dialogs, delete: kpi });
  };

  // Handle checkbox selection
  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredKpiData.map(item => item.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle bulk actions
  const handleBulkEdit = () => {
    if (selectedIds.length === 0) {
      toast.error("Pilih setidaknya satu target KPI untuk diedit.");
      return;
    }
    setDialogs({ ...dialogs, bulkEdit: true });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("Pilih setidaknya satu target KPI untuk dihapus.");
      return;
    }
    setDialogs({ ...dialogs, bulkDelete: true });
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      const { error } = await supabase
        .from("kpi_targets")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast.success(`Berhasil menghapus ${selectedIds.length} target KPI.`);
      setSelectedIds([]);
      setSelectAll(false);
      setDialogs({ ...dialogs, bulkDelete: false });
      fetchKpiData();
    } catch (error: any) {
      toast.error("Gagal menghapus target KPI: " + error.message);
    }
  };
  
  const handleSuccess = () => {
     setDialogs({ add: false, edit: null, delete: null, bulkDelete: false, bulkEdit: false });
     setSelectedIds([]);
     setSelectAll(false);
     fetchKpiData(); 
  };
  
  const filteredKpiData = kpiData.filter(item => {
    const matchesSearch = item.employees?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "achieved") {
      return matchesSearch && item.total_kpi >= 100;
    } else if (filterStatus === "not-achieved") {
      return matchesSearch && item.total_kpi < 100;
    }
    
    return matchesSearch;
  });

  // Update selectAll state when filtered data changes
  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectAll(false);
    } else if (selectedIds.length === filteredKpiData.length && filteredKpiData.length > 0) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedIds, filteredKpiData]);

  // Calculate summary stats
  const summaryStats = {
    totalEmployees: filteredKpiData.length,
    achievedTarget: filteredKpiData.filter(item => item.total_kpi >= 100).length,
    avgKpi: filteredKpiData.length > 0 
      ? filteredKpiData.reduce((sum, item) => sum + item.total_kpi, 0) / filteredKpiData.length 
      : 0,
    topPerformer: filteredKpiData.length > 0 ? filteredKpiData[0] : null
  };
  
  // --- FUNGSI HANDLE EXPORT ---
  const handleExport = (type: 'pdf' | 'csv') => {
    const columns = [
      { header: 'Rank', dataKey: 'rank' },
      { header: 'Karyawan', dataKey: 'employee_name' },
      { header: 'Bulan', dataKey: 'month_formatted' },
      { header: 'Omset Aktual', dataKey: 'actual_sales_formatted' },
      { header: 'Omset Target', dataKey: 'sales_target_formatted' },
      { header: 'Komisi Aktual', dataKey: 'actual_commission_formatted' },
      { header: 'Komisi Target', dataKey: 'commission_target_formatted' },
      { header: 'Absen Aktual', dataKey: 'actual_attendance_formatted' },
      { header: 'Absen Target', dataKey: 'attendance_target_formatted' },
      { header: 'Total KPI %', dataKey: 'total_kpi_formatted' },
    ];
    
    const exportData = filteredKpiData.map((item, index) => ({
        ...item,
        rank: `#${index + 1}`,
        employee_name: item.employees?.profiles?.full_name || 'N/A',
        month_formatted: formatDateMonth(item.target_month),
        actual_sales_formatted: formatCurrency(item.actual_sales),
        sales_target_formatted: formatCurrency(item.sales_target),
        actual_commission_formatted: formatCurrency(item.actual_commission),
        commission_target_formatted: formatCurrency(item.commission_target),
        actual_attendance_formatted: `${item.actual_attendance || 0} hari`,
        attendance_target_formatted: `${item.attendance_target} hari`,
        total_kpi_formatted: `${item.total_kpi.toFixed(1)}%`
    }));

    const options = {
        filename: 'Laporan_KPI_Karyawan',
        title: 'Laporan KPI Karyawan',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else {
        exportToCSV(options);
    }
  };


  if (!canRead && !loading) {
     return (
        <MainLayout>
           <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)]">
             <h1 className="text-2xl font-bold">Akses Ditolak</h1>
             <p className="text-muted-foreground">Anda tidak memiliki izin untuk melihat halaman ini.</p>
           </div>
         </MainLayout>
     )
  }


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Goal & Target KPI</h1>
            <p className="text-muted-foreground">
              Lacak pencapaian target tim dan individu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchKpiData()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {canManage && (
              <Button className="gap-2" onClick={() => setDialogs({ ...dialogs, add: true })}>
                <Plus className="h-4 w-4" />
                Set Target Baru
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Karyawan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : summaryStats.totalEmployees}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total karyawan dengan target KPI</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-green-100">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Target Tercapai
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : summaryStats.achievedTarget}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summaryStats.totalEmployees > 0 
                  ? `${((summaryStats.achievedTarget / summaryStats.totalEmployees) * 100).toFixed(1)}% dari total`
                  : "Tidak ada data"
                }
              </p>
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
              <div className={cn("text-2xl font-bold", getKpiTextColor(summaryStats.avgKpi))}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${summaryStats.avgKpi.toFixed(1)}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pencapaian rata-rata tim</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-orange-100">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <Star className="h-4 w-4" />
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                 summaryStats.topPerformer ? summaryStats.topPerformer.employees?.profiles?.full_name?.substring(0, 15) + "..." : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summaryStats.topPerformer ? `KPI: ${summaryStats.topPerformer.total_kpi.toFixed(1)}%` : "Tidak ada data"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Card */}
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Data
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-employee">Cari Karyawan</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="search-employee"
                    placeholder="Cari nama karyawan..." 
                    className="pl-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-status">Status Pencapaian</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={filterStatus === "all" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setFilterStatus("all")}
                  >
                    Semua
                  </Button>
                  <Button 
                    variant={filterStatus === "achieved" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setFilterStatus("achieved")}
                  >
                    Tercapai
                  </Button>
                  <Button 
                    variant={filterStatus === "not-achieved" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setFilterStatus("not-achieved")}
                  >
                    Belum Tercapai
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Export Data</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full gap-2" disabled={isExporting || filteredKpiData.length === 0}>
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
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {canManage && selectedIds.length > 0 && (
          <Card className="shadow-lg border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedIds.length} target KPI dipilih
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleBulkEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Sekaligus
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash className="h-4 w-4 mr-2" />
                    Hapus Sekaligus
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Table and Top Performers */}
        <Tabs defaultValue="table" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="table">Tabel KPI</TabsTrigger>
            <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="space-y-4">
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Ranking Karyawan (Berdasarkan KPI Total)
                </CardTitle>
                <CardDescription>
                  Menampilkan data target dan realisasi bulanan karyawan.
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
                          {canManage && (
                            <TableHead className="w-12">
                              <Checkbox 
                                checked={selectAll}
                                onCheckedChange={handleSelectAll}
                                aria-label="Select all"
                              />
                            </TableHead>
                          )}
                          <TableHead>Rank</TableHead>
                          <TableHead>Karyawan</TableHead>
                          <TableHead>Bulan</TableHead>
                          <TableHead>Omset (Aktual/Target)</TableHead>
                          <TableHead>Komisi (Aktual/Target)</TableHead>
                          <TableHead>Absensi (Aktual/Target)</TableHead>
                          <TableHead className="w-[200px]">Total KPI</TableHead>
                          <TableHead>Status</TableHead>
                          {canManage && <TableHead className="text-center">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredKpiData.length === 0 && (
                           <TableRow>
                             <TableCell colSpan={canManage ? 10 : 9} className="text-center h-24">
                               {searchTerm || filterStatus !== "all" ? "Tidak ada data KPI yang cocok dengan filter." : "Belum ada data target KPI yang ditetapkan."}
                             </TableCell>
                           </TableRow>
                        )}
                        {filteredKpiData.map((item, index) => (
                          <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                            {canManage && (
                              <TableCell>
                                <Checkbox 
                                  checked={selectedIds.includes(item.id)}
                                  onCheckedChange={() => handleSelectOne(item.id)}
                                  aria-label={`Select ${item.employees?.profiles?.full_name}`}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-medium">
                              {getRankIcon(index + 1)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={item.employees?.profiles?.avatar_url || undefined} alt={item.employees?.profiles?.full_name} />
                                  <AvatarFallback>{item.employees?.profiles?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{item.employees?.profiles?.full_name || "N/A"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{formatDateMonth(item.target_month)}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{formatCurrency(item.actual_sales)}</span>
                                <span className="text-xs text-muted-foreground">/ {formatCurrency(item.sales_target)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{formatCurrency(item.actual_commission)}</span>
                                <span className="text-xs text-muted-foreground">/ {formatCurrency(item.commission_target)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{item.actual_attendance || 0} hari</span>
                                <span className="text-xs text-muted-foreground">/ {item.attendance_target} hari</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={item.total_kpi} 
                                  className={cn("h-3 flex-1", getKpiColor(item.total_kpi))} 
                                />
                                <span className={cn("font-bold w-12 text-right", getKpiTextColor(item.total_kpi))}>
                                  {item.total_kpi.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(item.total_kpi)}
                                <span className={cn("text-sm font-medium", getKpiTextColor(item.total_kpi))}>
                                  {item.total_kpi >= 100 ? "Tercapai" : item.total_kpi >= 70 ? "Dalam Progres" : "Belum Tercapai"}
                                </span>
                              </div>
                            </TableCell>
                            {canManage && (
                              <TableCell className="text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit Target
                                    </DropdownMenuItem>
                                    {canDelete && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive"
                                          onClick={() => handleDeleteClick(item)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Hapus Target
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="top-performers" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Top Performers - KPI Tertinggi
                  </CardTitle>
                  <CardDescription>
                    Karyawan dengan pencapaian KPI tertinggi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredKpiData.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                      <p className="text-muted-foreground">Tidak ada data untuk ditampilkan.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredKpiData.slice(0, 5).map((item, index) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          {getRankIcon(index + 1)}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={item.employees?.profiles?.avatar_url || undefined} alt={item.employees?.profiles?.full_name} />
                                <AvatarFallback>{item.employees?.profiles?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{item.employees?.profiles?.full_name}</p>
                                <p className="text-sm text-muted-foreground">{formatDateMonth(item.target_month)}</p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-muted-foreground">Progress KPI</span>
                                <span className="text-sm font-medium">{item.total_kpi.toFixed(1)}%</span>
                              </div>
                              <Progress 
                                value={item.total_kpi} 
                                className={cn("h-2", getKpiColor(item.total_kpi))} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Performers - Omset Tertinggi
                  </CardTitle>
                  <CardDescription>
                    Karyawan dengan pencapaian omset tertinggi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredKpiData.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                      <p className="text-muted-foreground">Tidak ada data untuk ditampilkan.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredKpiData
                        .sort((a, b) => (b.actual_sales || 0) - (a.actual_sales || 0))
                        .slice(0, 5)
                        .map((item, index) => (
                          <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={item.employees?.profiles?.avatar_url || undefined} alt={item.employees?.profiles?.full_name} />
                                  <AvatarFallback>{item.employees?.profiles?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{item.employees?.profiles?.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{formatDateMonth(item.target_month)}</p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-muted-foreground">Omset</span>
                                  <span className="text-sm font-medium">{formatCurrency(item.actual_sales)}</span>
                                </div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-muted-foreground">Target</span>
                                  <span className="text-sm font-medium">{formatCurrency(item.sales_target)}</span>
                                </div>
                                <Progress 
                                  value={item.sales_pct} 
                                  className={cn("h-2", getKpiColor(item.sales_pct))} 
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {canManage && (
         <>
           <SetTargetDialog
             open={dialogs.add}
             onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
             onSuccess={handleSuccess}
           />
           {dialogs.edit && (
             <EditTargetDialog
                open={!!dialogs.edit}
                onOpenChange={(open) => setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })}
                onSuccess={handleSuccess}
                kpiToEdit={dialogs.edit}
              />
            )}
            {canDelete && dialogs.delete && (
              <DeleteTargetAlert
                open={!!dialogs.delete}
                onOpenChange={(open) => setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })}
                onSuccess={handleSuccess}
                kpiToDelete={dialogs.delete}
              />
            )}
            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={dialogs.bulkDelete} onOpenChange={(open) => setDialogs({ ...dialogs, bulkDelete: open })}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Konfirmasi Hapus Massal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus {selectedIds.length} target KPI yang dipilih? 
                    Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Hapus {selectedIds.length} Target
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
         </>
       )}
    </MainLayout>
  );
};

export default KPI;