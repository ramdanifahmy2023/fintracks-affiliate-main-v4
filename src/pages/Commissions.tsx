// src/pages/Commissions.tsx
import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Wallet,
  Download,
  CalendarIcon,
  Search,
  Printer,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, parseISO } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Import dialog-dialog
import { AddCommissionDialog } from "@/components/Commission/AddCommissionDialog";
import { EditCommissionDialog } from "@/components/Commission/EditCommissionDialog";
import { DeleteCommissionAlert } from "@/components/Commission/DeleteCommissionAlert";
import { useExport } from "@/hooks/useExport";

// Tipe data untuk komisi
export type CommissionData = {
  id: string;
  period: string;
  period_start: string;
  period_end: string;
  gross_commission: number;
  net_commission: number;
  paid_commission: number;
  payment_date: string | null;
  accounts: {
    id: string;
    username: string;
    group_id: string | null;
  };
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: CommissionData | null;
  delete: CommissionData | null;
};

// Tipe untuk summary
type CommissionSummary = {
  gross: number;
  net: number;
  paid: number;
};

// Tipe untuk filter grup
type Group = {
  id: string;
  name: string;
};

const Commissions = () => {
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [summary, setSummary] = useState<CommissionSummary>({ gross: 0, net: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterGroup, setFilterGroup] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  // --- 2. HANYA DEKLARASI useExport ---
  const { exportToPDF, exportToCSV, isExporting, printData } = useExport();

  const canManage =
    profile?.role === "superadmin" ||
    profile?.role === "leader" ||
    profile?.role === "admin";
    
  const canDelete = profile?.role === "superadmin";

  // Helper format
  const formatCurrency = (amount: number | null) => {
    if (amount === null || isNaN(amount)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatCurrencyForExport = (amount: number | null) => {
    if (amount === null || isNaN(amount)) return "0";
    return amount.toString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString + "T00:00:00"); 
    return format(date, "dd MMM yyyy", { locale: indonesiaLocale });
  };
  
  const formatDateForExport = (dateString: string | null) => {
    if (!dateString) return "-";
    return dateString;
  };

  const fetchCommissions = useCallback(async (
    startDate: string,
    endDate: string,
    groupId: string,
    search: string,
    page: number = 1
  ) => {
    setLoading(true);
    try {
      // Hitung total count terlebih dahulu
      let countQuery = supabase
        .from("commissions")
        .select("id", { count: "exact", head: true })
        .gte("period_start", startDate)
        .lte("period_start", endDate);

      if (groupId !== "all") {
        countQuery = countQuery.eq("accounts.group_id", groupId);
      }
      
      if (search.trim() !== "") {
        countQuery = countQuery.ilike("accounts.username", `%${search.trim()}%`);
      }
      
      const { count: totalCountResult, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(totalCountResult || 0);

      // Ambil data dengan pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("commissions")
        .select(
          `
          id,
          period,
          period_start,
          period_end,
          gross_commission,
          net_commission,
          paid_commission,
          payment_date,
          accounts!inner ( id, username, group_id )
        `
        )
        // --- 3. FILTER UTAMA BERDASARKAN RENTANG WAKTU (period_start) ---
        .gte("period_start", startDate)
        .lte("period_start", endDate)
        // -----------------------------------------------------------------
        .order("period_start", { ascending: false })
        .range(from, to);

      // --- 4. FILTER GROUP PADA TABEL YANG DIJOIN (accounts) ---
      if (groupId !== "all") {
        query = query.eq("accounts.group_id", groupId);
      }
      
      // --- 5. FILTER SEARCH PADA USERNAME ---
      if (search.trim() !== "") {
         query = query.ilike("accounts.username", `%${search.trim()}%`);
      }
      // --------------------------------------------------------

      const { data, error } = await query;

      if (error) throw error;
      setCommissions(data as any);
      
      // Hitung summary dari semua data (bukan hanya yang di halaman ini)
      let summaryQuery = supabase
        .from("commissions")
        .select("gross_commission, net_commission, paid_commission")
        .gte("period_start", startDate)
        .lte("period_start", endDate);

      if (groupId !== "all") {
        summaryQuery = summaryQuery.eq("accounts.group_id", groupId);
      }
      
      if (search.trim() !== "") {
        summaryQuery = summaryQuery.ilike("accounts.username", `%${search.trim()}%`);
      }

      const { data: summaryData, error: summaryError } = await summaryQuery;
      if (summaryError) throw summaryError;

      const gross = (summaryData as any[]).reduce((acc, c) => acc + (c.gross_commission || 0), 0);
      const net = (summaryData as any[]).reduce((acc, c) => acc + (c.net_commission || 0), 0);
      const paid = (summaryData as any[]).reduce((acc, c) => acc + (c.paid_commission || 0), 0);
      setSummary({ gross, net, paid });

    } catch (error: any) {
      toast.error("Gagal memuat data komisi.", {
        description: error.message,
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- 6. useEffect untuk memicu fetch data saat filter berubah ---
  useEffect(() => {
    if (profile) { 
        fetchCommissions(filterDateStart, filterDateEnd, filterGroup, searchTerm, currentPage);
    }
  }, [profile, fetchCommissions, filterDateStart, filterDateEnd, filterGroup, searchTerm, currentPage]);

  // --- 7. useEffect untuk mengambil daftar group ---
  useEffect(() => {
    const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (data) {
            setAvailableGroups(data);
        }
    };
    fetchGroups();
  }, []);

  // Reset ke halaman 1 saat filter berubah
  const handleFilterChange = () => {
    setCurrentPage(1);
  };
  
  // FUNGSI HANDLE EXPORT (TETAP SAMA, TIDAK DIUBAH)
  const handleExport = (type: 'pdf' | 'csv' | 'print') => {
    const columns = [
      { header: 'No', dataKey: 'row_number' },
      { header: 'Akun', dataKey: 'account_username' },
      { header: 'Periode', dataKey: 'period' },
      { header: 'Tgl Mulai', dataKey: 'period_start' },
      { header: 'Tgl Selesai', dataKey: 'period_end' },
      { header: 'Tgl Cair', dataKey: 'payment_date_formatted' },
      { header: 'Komisi Kotor (Rp)', dataKey: 'gross_commission' },
      { header: 'Komisi Bersih (Rp)', dataKey: 'net_commission' },
      { header: 'Komisi Cair (Rp)', dataKey: 'paid_commission' },
    ];
    
    const exportData = commissions.map((c, index) => ({
        ...c,
        row_number: (currentPage - 1) * itemsPerPage + index + 1,
        account_username: c.accounts?.username || 'N/A',
        payment_date_formatted: formatDateForExport(c.payment_date),
        gross_commission: c.gross_commission || 0,
        net_commission: c.net_commission || 0,
        paid_commission: c.paid_commission || 0,
    }));

    const options = {
        filename: 'Laporan_Data_Komisi',
        title: 'Laporan Data Komisi Affiliate',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else if (type === 'csv') {
        exportToCSV(options);
    } else {
        // Panggil fungsi printData baru dari hook
        printData(options); 
    }
  };


  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Section dengan Background Gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Data Komisi Affiliate</h1>
              <p className="text-blue-100 mt-1">
                Kelola data komisi kotor, bersih, dan cair.
              </p>
            </div>
            {canManage && (
              <Button
                className="gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-md"
                onClick={() => setDialogs({ ...dialogs, add: true })}
              >
                <Plus className="h-4 w-4" />
                Input Komisi
              </Button>
            )}
          </div>
        </div>

        {/* KARTU SUMMARY dengan Desain yang Lebih Menarik */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-green-500 rounded-md">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                Komisi Kotor (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(summary.gross)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total komisi kotor berdasarkan filter</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 rounded-md">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
                Komisi Bersih (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(summary.net)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total komisi bersih berdasarkan filter</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-purple-500 rounded-md">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                Komisi Cair (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(summary.paid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total komisi yang sudah cair</p>
            </CardContent>
          </Card>
        </div>

        {/* UI FILTER dengan Desain yang Lebih Menarik */}
        <Card className="shadow-md border-0 overflow-hidden dark:bg-card dark:border-border">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-gray-900 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-slate-600" />
              Filter Data
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 dark:bg-card">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Filter Tanggal Mulai */}
              <div className="space-y-2">
                <Label htmlFor="date-start" className="text-sm font-medium">Tanggal Mulai Periode</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-start"
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal border-slate-200", !filterDateStart && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDateStart ? format(parseISO(filterDateStart), "PPP") : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={parseISO(filterDateStart)}
                      onSelect={(date) => {
                        setFilterDateStart(format(date, "yyyy-MM-dd"));
                        handleFilterChange();
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Filter Tanggal Selesai */}
              <div className="space-y-2">
                <Label htmlFor="date-end" className="text-sm font-medium">Tanggal Selesai Periode</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-end"
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal border-slate-200", !filterDateEnd && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDateEnd ? format(parseISO(filterDateEnd), "PPP") : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={parseISO(filterDateEnd)}
                      onSelect={(date) => {
                        setFilterDateEnd(format(date, "yyyy-MM-dd"));
                        handleFilterChange();
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filter Grup */}
              <div className="space-y-2">
                <Label htmlFor="filter-group" className="text-sm font-medium">Group</Label>
                <Select 
                  value={filterGroup} 
                  onValueChange={(value) => {
                    setFilterGroup(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger id="filter-group" className="border-slate-200">
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

              {/* Filter Search */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium">Cari Username</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Cari username..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleFilterChange();
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabel Data dengan Desain yang Lebih Menarik */}
        <Card className="shadow-md border-0 overflow-hidden dark:bg-card dark:border-border">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-gray-900">
            <div className="flex justify-between items-center">
              <CardTitle>Riwayat Komisi</CardTitle>
              <div className="flex items-center gap-2">
                {/* Tombol Export */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={isExporting || commissions.length === 0}>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport('print')} disabled={isExporting}>
                      <Printer className="mr-2 h-4 w-4" />
                      Cetak Halaman
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 dark:bg-card">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan {commissions.length} dari {totalCount} data
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loading}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <span className="px-3 py-1 text-sm border rounded-md">
                      Halaman {currentPage} dari {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages || loading}
                      className="gap-1"
                    >
                      Selanjutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>Akun</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Tgl. Komisi Cair</TableHead>
                        <TableHead className="text-right">Kotor</TableHead>
                        <TableHead className="text-right">Bersih</TableHead>
                        <TableHead className="text-right">Cair</TableHead>
                        {canManage && <TableHead className="text-right">Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            Tidak ada data komisi untuk filter yang dipilih.
                          </TableCell>
                        </TableRow>
                      )}
                      {commissions.map((c, index) => (
                        <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {c.accounts?.username?.substring(0, 2).toUpperCase() || "NA"}
                                </span>
                              </div>
                              {c.accounts?.username || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "w-fit",
                                  c.period === "M1" && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                                  c.period === "M2" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                                  c.period === "M3" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                                  c.period === "M4" && "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                                  c.period === "M5" && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                                )}
                              >
                                {c.period}
                              </Badge>
                              <span className="text-xs text-muted-foreground mt-1">
                                {formatDate(c.period_start)} - {formatDate(c.period_end)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {c.payment_date ? (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  {formatDate(c.payment_date)}
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                  <span className="text-muted-foreground">Belum cair</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(c.gross_commission)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(c.net_commission)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(c.paid_commission)}
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDialogs({ ...dialogs, edit: c })
                                    }
                                  >
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() =>
                                          setDialogs({ ...dialogs, delete: c })
                                        }
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" /> Hapus
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center mt-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1 || loading}
                    >
                      Awal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loading}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={loading}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages || loading}
                      className="gap-1"
                    >
                      Selanjutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || loading}
                    >
                      Akhir
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <>
          <AddCommissionDialog
            open={dialogs.add}
            onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
            onSuccess={() => {
              setDialogs({ ...dialogs, add: false });
              // Panggil ulang fetch dengan filter saat ini
              fetchCommissions(filterDateStart, filterDateEnd, filterGroup, searchTerm, currentPage); 
            }}
          />
          {dialogs.edit && (
            <EditCommissionDialog
              open={!!dialogs.edit}
              onOpenChange={(open) =>
                setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })
              }
              onSuccess={() => {
                setDialogs({ ...dialogs, edit: null });
                fetchCommissions(filterDateStart, filterDateEnd, filterGroup, searchTerm, currentPage);
              }}
              commission={dialogs.edit}
            />
          )}
          {canDelete && dialogs.delete && (
            <DeleteCommissionAlert
              open={!!dialogs.delete}
              onOpenChange={(open) =>
                setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })
              }
              onSuccess={() => {
                setDialogs({ ...dialogs, delete: null });
                fetchCommissions(filterDateStart, filterDateEnd, filterGroup, searchTerm, currentPage);
              }}
              commission={dialogs.delete}
            />
          )}
        </>
      )}
    </MainLayout>
  );
};

export default Commissions;