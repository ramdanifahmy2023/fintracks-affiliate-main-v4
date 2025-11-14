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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Download, Loader2, ArrowUpRight, ArrowDownLeft, MoreHorizontal, Pencil, Trash2, CalendarIcon, Filter, CreditCard, TrendingUp, TrendingDown, Scale } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, subDays } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { AddDebtReceivableDialog } from "@/components/DebtReceivable/AddDebtReceivableDialog"; 
import { EditDebtDialog } from "@/components/Debt/EditDebtDialog"; 
import { DeleteDebtAlert } from "@/components/Debt/DeleteDebtAlert"; 
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport"; 

// Tipe data dari Supabase
export type DebtData = {
  id: string;
  created_at: string;
  type: "debt" | "receivable";
  counterparty: string;
  amount: number;
  due_date: string | null;
  status: string | null;
  description: string | null; 
  group_id: string | null; 
  groups: { name: string, id: string } | null; 
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  addType: "debt" | "receivable"; 
  edit: DebtData | null;
  delete: DebtData | null;
};

// Tipe data baru untuk filter
type Group = { id: string; name: string };
const STATUSES = ["Belum Lunas", "Cicilan", "Lunas"]

const DebtReceivable = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<DebtData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"debt" | "receivable">("debt");
  
  // --- STATE FILTER BARU ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  // Default: 90 hari terakhir untuk menampilkan semua data yang relevan
  const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  // -------------------------
  
  // INISIALISASI HOOK EXPORT
  const { exportToPDF, exportToCSV, isExporting, printData } = useExport();
  
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    addType: "debt",
    edit: null,
    delete: null,
  });

  const canCreate =
    profile?.role === "superadmin" ||
    profile?.role === "leader" ||
    profile?.role === "admin";
  const canManage = profile?.role === "superadmin" || profile?.role === "admin"; 

  // Helper format
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`), "dd MMM yyyy");
    } catch (e) { return "-"; }
  }
  
  const formatDateForExport = (dateString: string | null) => {
    if (!dateString) return "-";
    return dateString; // Format YYYY-MM-DD
  };

  const fetchData = useCallback(async (
    groupId: string, 
    status: string,
    startDate: string,
    endDate: string,
  ) => {
    setLoading(true);
    try {
      let query = supabase
        .from("debt_receivable")
        .select(`
          id,
          created_at,
          type,
          counterparty,
          amount,
          due_date,
          status,
          description,
          group_id,
          groups ( name, id )
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });
        
      if (groupId !== 'all') {
          query = query.eq('group_id', groupId);
      }
      if (status !== 'all') {
          query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setData((data || []) as DebtData[]);
    } catch (error) {
      toast.error("Gagal memuat data hutang piutang.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- useEffect untuk memicu fetch data saat filter/tab berubah ---
  useEffect(() => {
    fetchData(filterGroup, filterStatus, filterDateStart, filterDateEnd);
  }, [fetchData, filterGroup, filterStatus, filterDateStart, filterDateEnd]);
  
  // --- useEffect untuk mengambil daftar group ---
  useEffect(() => {
    const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (data) {
            setAvailableGroups(data);
        }
    };
    fetchGroups();
  }, []);

  // Pisahkan data untuk tabel dan summary
  const debts = data.filter(
    (t) =>
      t.type === "debt" &&
      t.counterparty.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const receivables = data.filter(
    (t) =>
      t.type === "receivable" &&
      t.counterparty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter untuk summary (hanya status Belum Lunas dan Cicilan)
  const totalDebt = debts.filter(s => s.status === 'Belum Lunas' || s.status === 'Cicilan').reduce((sum, item) => sum + item.amount, 0);
  const totalReceivable = receivables.filter(s => s.status === 'Belum Lunas' || s.status === 'Cicilan').reduce((sum, item) => sum + item.amount, 0);
  const netPosition = totalReceivable - totalDebt;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Lunas":
        return <Badge className="bg-green-600 hover:bg-green-600/90">Lunas</Badge>;
      case "Cicilan":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100/80">Cicilan</Badge>;
      case "Belum Lunas":
        return <Badge className="bg-red-600 hover:bg-red-600/90">Belum Lunas</Badge>;
      default:
        return <Badge variant="outline">{status || "Pending"}</Badge>;
    }
  };
  
  // FUNGSI HANDLE EXPORT
  const handleExport = (type: 'pdf' | 'csv' | 'print') => {
    const columns = [
      { header: 'Tanggal Dibuat', dataKey: 'created_at_formatted' },
      { header: 'Pihak Terkait', dataKey: 'counterparty' },
      { header: 'Grup', dataKey: 'group_name' },
      { header: 'Jatuh Tempo', dataKey: 'due_date_formatted' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Nominal (Rp)', dataKey: 'amount' },
      { header: 'Deskripsi', dataKey: 'description' },
    ];
    
    // Tentukan data berdasarkan tab aktif
    const dataToExport = activeTab === 'debt' ? debts : receivables;
    const tabTitle = activeTab === 'debt' ? 'Hutang' : 'Piutang';
    
    const exportData = dataToExport.map(item => ({
        ...item,
        created_at_formatted: formatDateForExport(item.created_at),
        due_date_formatted: formatDateForExport(item.due_date),
        group_name: item.groups?.name || '-',
        description: item.description || '-',
        status: item.status || 'Pending',
    }));

    const options = {
        filename: `Laporan_${tabTitle}`,
        title: `Laporan ${tabTitle} Perusahaan`,
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else if (type === 'csv') {
        exportToCSV(options);
    } else {
        printData(options);
    }
  };
  
  
  const handleAddClick = () => {
    setDialogs({ 
        ...dialogs, 
        add: true, 
        addType: activeTab as "debt" | "receivable"
    });
  }
  
  const handleEditClick = (debt: DebtData) => {
    setDialogs({ ...dialogs, edit: debt });
  };
  
  const handleDeleteClick = (debt: DebtData) => {
    setDialogs({ ...dialogs, delete: debt });
  };
  
  const handleSuccess = () => {
     setDialogs({ ...dialogs, add: false, edit: null, delete: null });
     fetchData(filterGroup, filterStatus, filterDateStart, filterDateEnd); 
  }

  const renderTable = (items: DebtData[]) => (
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="font-medium text-slate-700">Tanggal Dibuat</TableHead>
          <TableHead className="font-medium text-slate-700">Pihak Terkait</TableHead>
          <TableHead className="font-medium text-slate-700">Grup</TableHead>
          <TableHead className="font-medium text-slate-700">Jatuh Tempo</TableHead>
          <TableHead className="font-medium text-slate-700">Status</TableHead>
          <TableHead className="text-right font-medium text-slate-700">Nominal</TableHead>
          {canManage && <TableHead className="text-center font-medium text-slate-700">Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center text-muted-foreground">
              {searchTerm ? "Tidak ada data ditemukan." : "Belum ada data."}
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
              <TableCell className="font-medium">{formatDate(item.created_at)}</TableCell>
              <TableCell className="font-medium">{item.counterparty}</TableCell>
              <TableCell>
                {item.groups ? (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{item.groups.name}</Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{formatDate(item.due_date)}</TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell className={cn(
                  "text-right font-bold",
                  item.type === 'debt' ? 'text-red-600' : 'text-green-600'
                )}>
                {formatCurrency(item.amount)}
              </TableCell>
              {canManage && (
                <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-slate-200">
                        <DropdownMenuItem onClick={() => handleEditClick(item)} className="hover:bg-blue-50 focus:bg-blue-50">
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive hover:bg-red-50 focus:bg-red-50"
                          onClick={() => handleDeleteClick(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Section dengan Background Gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Saldo Hutang & Piutang</h1>
              <p className="text-blue-100 mt-1">
                Lacak semua kewajiban dan tagihan dengan mudah dan efisien.
              </p>
            </div>
            {canCreate && (
              <Button className="gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-md" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
                Tambah Catatan
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards dengan Desain yang Lebih Menarik */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-rose-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-red-500 rounded-md">
                  <TrendingDown className="h-4 w-4 text-white" />
                </div>
                Total Hutang (Belum Lunas)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalDebt)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total kewajiban yang belum dilunasi</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-green-500 rounded-md">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                Total Piutang (Belum Lunas)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalReceivable)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total tagihan yang belum diterima</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 rounded-md">
                  <Scale className="h-4 w-4 text-white" />
                </div>
                Posisi Keuangan (Net)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div
                className={`text-2xl font-bold ${
                  netPosition >= 0 ? "text-blue-600" : "text-red-600"
                }`}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(netPosition)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Selisih antara piutang dan hutang</p>
            </CardContent>
          </Card>
        </div>

        {/* UI FILTER dengan Desain yang Lebih Menarik */}
        <Card className="shadow-md border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-slate-600" />
              Filter Data
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Filter Tanggal Mulai */}
                <div className="space-y-2">
                    <Label htmlFor="date-start" className="text-sm font-medium">Tanggal Mulai</Label>
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
                        onSelect={(date) => date && setFilterDateStart(format(date, "yyyy-MM-dd"))}
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                </div>
                
                {/* Filter Tanggal Selesai */}
                <div className="space-y-2">
                    <Label htmlFor="date-end" className="text-sm font-medium">Tanggal Selesai</Label>
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
                        onSelect={(date) => date && setFilterDateEnd(format(date, "yyyy-MM-dd"))}
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                </div>
              {/* Filter Grup */}
              <div className="space-y-2">
                <Label htmlFor="filter-group" className="text-sm font-medium">Group</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
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
               {/* Filter Status */}
              <div className="space-y-2">
                <Label htmlFor="filter-status" className="text-sm font-medium">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" className="border-slate-200">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {STATUSES.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs and Table dengan Desain yang Lebih Modern */}
        <Card className="shadow-md border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "debt" | "receivable")} className="w-full sm:w-auto">
                <TabsList className="grid w-full sm:w-auto grid-cols-2 bg-slate-100">
                  <TabsTrigger value="debt" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Hutang (Kewajiban)</TabsTrigger>
                  <TabsTrigger value="receivable" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Piutang (Tagihan)</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Cari nama pihak..." 
                    className="pl-10 w-full sm:w-64 border-slate-200 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {/* TOMBOL EXPORT */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 bg-white hover:bg-slate-50 border-slate-200" disabled={isExporting || (activeTab === 'debt' ? debts.length === 0 : receivables.length === 0)}>
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
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "debt" | "receivable")}>
                <TabsContent value="debt" className="mt-0">
                  <div className="overflow-x-auto">
                    {renderTable(debts)}
                  </div>
                </TabsContent>
                <TabsContent value="receivable" className="mt-0">
                  <div className="overflow-x-auto">
                    {renderTable(receivables)}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      
      {canCreate && (
         <AddDebtReceivableDialog
           open={dialogs.add}
           type={dialogs.addType} 
           onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
           onSuccess={handleSuccess}
         />
       )}
       {canManage && (
         <>
           {dialogs.edit && (
             <EditDebtDialog
               open={!!dialogs.edit}
               onOpenChange={(open) => setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })}
               onSuccess={handleSuccess}
               debt={dialogs.edit}
             />
           )}
           {dialogs.delete && (
             <DeleteDebtAlert
               open={!!dialogs.delete}
               onOpenChange={(open) => setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })}
               onSuccess={handleSuccess}
               debt={dialogs.delete}
             />
           )}
         </>
       )}
    </MainLayout>
  );
};

export default DebtReceivable;