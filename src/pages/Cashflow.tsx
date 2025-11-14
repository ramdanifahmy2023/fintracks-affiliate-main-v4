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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Scale,
  Link as LinkIcon,
  Download,
  CalendarIcon,
  Search,
  Printer,
  Filter,
  DollarSign,
  CreditCard,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, parseISO } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AddTransactionDialog } from "@/components/Cashflow/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/Cashflow/EditTransactionDialog";
import { DeleteTransactionAlert } from "@/components/Cashflow/DeleteTransactionAlert";
import { useExport } from "@/hooks/useExport";

// Tipe data untuk Transaksi
export type TransactionData = {
  id: string;
  transaction_date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  proof_url: string | null;
  groups: {
    id: string;
    name: string;
  } | null;
  profiles: {
    id: string;
    full_name: string;
  } | null;
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: TransactionData | null;
  delete: TransactionData | null;
};

// Tipe data baru
type Group = { id: string; name: string };
const allCategories = ["Komisi Cair", "Fix Cost", "Variable Cost", "Lain-lain"];

const Cashflow = () => {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "income" | "expense">("all");
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  const { exportToPDF, exportToCSV, isExporting, printData } = useExport();

  const canManage = profile && (
    profile.role === "superadmin" ||
    profile.role === "leader" ||
    profile.role === "admin"
  );
  const canDelete = profile && profile.role === "superadmin";

  const formatCurrency = (amount: number | null) => {
    if (amount === null || isNaN(amount)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString + "T00:00:00");
      if (isNaN(date.getTime())) return "-"; 
      return format(date, "dd MMM yyyy", { locale: indonesiaLocale });
    } catch {
      return "-";
    }
  };
  
  const formatDateForExport = (dateString: string | null) => {
    if (!dateString) return "-";
    return dateString;
  };

  const fetchTransactions = useCallback(async (
    startDate: string,
    endDate: string,
    groupId: string,
    category: string,
    search: string
  ) => {
    setLoading(true);
    try {
      let query = supabase
        .from("cashflow")
        .select(
          `
          id,
          transaction_date,
          type,
          category,
          amount,
          description,
          proof_url,
          groups ( id, name ),
          profiles ( id, full_name )
        `
        )
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("transaction_date", { ascending: false });

      if (groupId !== "all") {
        query = query.eq("group_id", groupId);
      }
      if (category !== "all") {
        query = query.eq("category", category);
      }
      if (search.trim() !== "") {
        query = query.ilike("description", `%${search.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const validatedData = (data || []).map((item: any) => ({
        ...item,
        amount: typeof item.amount === 'number' ? item.amount : 0,
        transaction_date: item.transaction_date || new Date().toISOString().split('T')[0],
      }));
      
      setTransactions(validatedData as TransactionData[]);
    } catch (error: any) {
      console.error("Error fetching cashflow:", error);
      toast.error("Gagal memuat data cashflow: " + (error?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if(profile) {
        fetchTransactions(filterDateStart, filterDateEnd, filterGroup, filterCategory, searchTerm);
    }
  }, [profile, fetchTransactions, filterDateStart, filterDateEnd, filterGroup, filterCategory, searchTerm]);

  useEffect(() => {
    const fetchGroups = async () => {
        const { data, error } = await supabase.from("groups").select("id, name");
        if (data) {
            setAvailableGroups(data);
        }
    };
    fetchGroups();
  }, []);


  const { totalIncome, totalExpense, netBalance } = transactions.reduce(
    (acc, t) => {
      const amount = typeof t.amount === 'number' ? t.amount : 0;
      if (t.type === 'income') acc.totalIncome += amount;
      if (t.type === 'expense') acc.totalExpense += amount;
      acc.netBalance = acc.totalIncome - acc.totalExpense;
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, netBalance: 0 }
  );

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'all') return true;
    return t.type === activeTab;
  });
  
  const handleExport = (type: 'pdf' | 'csv' | 'print') => {
    const columns = [
      { header: 'Tanggal', dataKey: 'transaction_date_formatted' },
      { header: 'Tipe', dataKey: 'type' },
      { header: 'Deskripsi', dataKey: 'description' },
      { header: 'Kategori', dataKey: 'category' },
      { header: 'Grup', dataKey: 'group_name' },
      { header: 'Oleh', dataKey: 'created_by_name' },
      { header: 'Nominal (Rp)', dataKey: 'amount_formatted' },
    ];
    
    const exportData = filteredTransactions.map(t => ({
        ...t,
        transaction_date_formatted: formatDateForExport(t.transaction_date),
        group_name: t.groups?.name || '-',
        created_by_name: t.profiles?.full_name || '-',
        amount_formatted: t.type === 'income' ? t.amount : -t.amount,
    }));
    
    const tabTitle = activeTab === 'all' ? 'Semua' : (activeTab === 'income' ? 'Pemasukan' : 'Pengeluaran');

    const options = {
        filename: `Laporan_Cashflow_${tabTitle}`,
        title: `Laporan Arus Kas (Cashflow) - ${tabTitle}`,
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


  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Section dengan Background Gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Arus Kas (Cashflow)</h1>
              <p className="text-blue-100 mt-1">
                Kelola semua pemasukan dan pengeluaran dengan mudah dan efisien.
              </p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-md" disabled={isExporting || filteredTransactions.length === 0}>
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
              {canManage && (
                <Button
                  className="gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-md"
                  onClick={() => setDialogs({ ...dialogs, add: true })}
                >
                  <Plus className="h-4 w-4" />
                  Tambah Transaksi
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* UI FILTER BARU dengan Desain yang Lebih Menarik */}
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
                    
                    {/* Filter Kategori */}
                    <div className="space-y-2">
                        <Label htmlFor="filter-category" className="text-sm font-medium">Kategori</Label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger id="filter-category" className="border-slate-200">
                            <SelectValue placeholder="Pilih Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            {allCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* KARTU SUMMARY dengan Desain yang Lebih Menarik */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-green-500 rounded-md">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                Total Pemasukan (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total pemasukan berdasarkan filter</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-rose-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-red-500 rounded-md">
                  <TrendingDown className="h-4 w-4 text-white" />
                </div>
                Total Pengeluaran (Filter)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalExpense)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total pengeluaran berdasarkan filter</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 rounded-md">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
                Saldo (Net Filter)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className={cn(
                "text-2xl font-bold",
                netBalance >= 0 ? "text-blue-600" : "text-red-600"
              )}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(netBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Saldo bersih setelah pemasukan dan pengeluaran</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs dan Tabel Data dengan Desain yang Lebih Modern */}
        <Card className="shadow-md border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
                <TabsList className="grid w-full sm:w-auto grid-cols-3 bg-slate-100">
                  <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Semua Transaksi</TabsTrigger>
                  <TabsTrigger value="income" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Pemasukan</TabsTrigger>
                  <TabsTrigger value="expense" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Pengeluaran</TabsTrigger>
                </TabsList>
              </Tabs>
              {/* Search Input */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari deskripsi..." 
                  className="pl-10 w-full sm:w-64 border-slate-200 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-medium text-slate-700">Tanggal</TableHead>
                      <TableHead className="font-medium text-slate-700">Deskripsi</TableHead>
                      <TableHead className="font-medium text-slate-700">Grup</TableHead>
                      <TableHead className="font-medium text-slate-700">Kategori</TableHead>
                      <TableHead className="font-medium text-slate-700">Oleh</TableHead>
                      <TableHead className="font-medium text-slate-700">Bukti</TableHead>
                      <TableHead className="text-right font-medium text-slate-700">Jumlah</TableHead>
                      {canManage && <TableHead className="w-20 text-center font-medium text-slate-700">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={canManage ? 8 : 7} className="text-center h-24 text-muted-foreground">
                          Tidak ada data transaksi untuk filter yang dipilih.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredTransactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="whitespace-nowrap font-medium">{formatDate(t.transaction_date)}</TableCell>
                        <TableCell className="font-medium max-w-xs truncate">
                          {t.description}
                        </TableCell>
                        <TableCell>
                          {t.groups ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">{t.groups.name}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">{t.category}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {t.profiles?.full_name || "-"}
                        </TableCell>
                        <TableCell>
                          {t.proof_url ? (
                            <Button variant="outline" size="sm" className="bg-blue-50 hover:bg-blue-100 border-blue-200" asChild>
                              <a href={t.proof_url} target="_blank" rel="noopener noreferrer">
                                <LinkIcon className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold whitespace-nowrap",
                          t.type === 'income' ? "text-green-600" : "text-red-600"
                        )}>
                          {t.type === 'expense' && "-"}
                          {formatCurrency(t.amount)}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="border-slate-200">
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDialogs({ ...dialogs, edit: t })
                                  }
                                  className="hover:bg-blue-50 focus:bg-blue-50"
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive hover:bg-red-50 focus:bg-red-50"
                                      onClick={() =>
                                        setDialogs({ ...dialogs, delete: t })
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
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <>
          <AddTransactionDialog
            open={dialogs.add}
            onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
            onSuccess={() => {
              setDialogs({ ...dialogs, add: false });
              fetchTransactions(filterDateStart, filterDateEnd, filterGroup, filterCategory, searchTerm);
            }}
          />
          <EditTransactionDialog
            open={!!dialogs.edit}
            onOpenChange={(open) =>
              setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })
            }
            onSuccess={() => {
              setDialogs({ ...dialogs, edit: null });
              fetchTransactions(filterDateStart, filterDateEnd, filterGroup, filterCategory, searchTerm);
            }}
            transaction={dialogs.edit}
          />
          <DeleteTransactionAlert
            open={!!dialogs.delete}
            onOpenChange={(open) =>
              setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })
            }
            onSuccess={() => {
              setDialogs({ ...dialogs, delete: null });
              fetchTransactions(filterDateStart, filterDateEnd, filterGroup, filterCategory, searchTerm);
            }}
            transaction={dialogs.delete}
          />
        </>
      )}
    </MainLayout>
  );
};

export default Cashflow;