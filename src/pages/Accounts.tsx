// src/pages/Accounts.tsx
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Download,
  UserCircle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  Printer,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Info,
  Filter,
  RefreshCw,
  Grid,
  List,
  Users,
  Activity,
  Smartphone,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddAccountDialog } from "@/components/Account/AddAccountDialog";
import { EditAccountDialog } from "@/components/Account/EditAccountDialog";
import { DeleteAccountAlert } from "@/components/Account/DeleteAccountAlert";
import { BulkImportDialog } from "@/components/Account/BulkImportDialog";
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";

type AccountData = {
  id: string;
  platform: "shopee" | "tiktok";
  username: string;
  email: string;
  phone: string | null;
  account_status: "active" | "banned_temporary" | "banned_permanent" | null;
  data_status: "empty" | "in_progress" | "rejected" | "verified" | null;
  groups: {
    name: string;
  } | null;
  created_at?: string;
};

type DialogState = {
  add: boolean;
  edit: AccountData | null;
  delete: AccountData | null;
  import: boolean;
};

/**
 * StatusPill: small presentational component for status labels
 * - icon: lucide-react icon
 * - label: visible text (in Indonesian)
 * - tone: color selection (tailwind utility classes)
 *
 * Note: This is non-interactive (role="status") but styled like a pill/button
 * so it reads clearly in tables and lists.
 */
function StatusPill({
  label,
  tone = "gray",
  Icon,
  title,
}: {
  label: string;
  tone?: "green" | "yellow" | "red" | "blue" | "gray" | "orange";
  Icon?: React.ComponentType<any>;
  title?: string;
}) {
  const toneClasses: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    yellow: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    blue: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    gray: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    orange: "bg-[#FFF4E6] text-[#7A4A00] dark:bg-[#4A2A00]/20",
  };

  return (
    <span
      role="status"
      title={title || label}
      aria-label={title || label}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium select-none",
        "border border-transparent",
        toneClasses[tone]
      )}
      style={{ minWidth: 120 }}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

const Accounts = () => {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / pageSize);

  const { exportToPDF, exportToCSV, isExporting, printData } = useExport();

  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
    import: false,
  });

  const canManageAccounts =
    profile?.role === "superadmin" || profile?.role === "leader";
  const canDelete = profile?.role === "superadmin";

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // Calculate pagination range
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build query with filters
      let query = supabase
        .from("accounts")
        .select(`
          id,
          platform,
          username,
          email,
          phone,
          account_status,
          data_status,
          groups ( name ),
          created_at
        `, { count: 'exact' })
        .order("created_at", { ascending: false })
        .range(from, to);

      // Apply filters
      if (platformFilter !== "all") {
        query = query.eq("platform", platformFilter);
      }
      if (accountStatusFilter !== "all") {
        query = query.eq("account_status", accountStatusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setAccounts(data as any);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast.error("Gagal memuat data akun.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [currentPage, pageSize, platformFilter, accountStatusFilter]);

  useEffect(() => {
    const results = accounts
      .filter((acc) => {
        return (
          acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          acc.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    setFilteredAccounts(results);
  }, [searchTerm, accounts]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [platformFilter, accountStatusFilter, pageSize]);

  const handleEditClick = (account: AccountData) => {
    setDialogs({ ...dialogs, edit: account });
  };

  const handleDeleteClick = (account: AccountData) => {
    setDialogs({ ...dialogs, delete: account });
  };

  const handleSuccess = () => {
    setDialogs({ add: false, edit: null, delete: null, import: false });
    fetchAccounts();
  };

  // map account_status to a nice pill (label + icon + tone)
  const renderAccountStatus = (status: AccountData["account_status"]) => {
    switch (status) {
      case "active":
        return (
          <StatusPill
            label="Aktif"
            tone="green"
            Icon={CheckCircle}
            title="Akun aktif dan bisa digunakan"
          />
        );
      case "banned_temporary":
        return (
          <StatusPill
            label="Banned (Sementara)"
            tone="yellow"
            Icon={AlertCircle}
            title="Akun diblokir sementara — cek alasan & durasi"
          />
        );
      case "banned_permanent":
        return (
          <StatusPill
            label="Banned (Permanen)"
            tone="red"
            Icon={XCircle}
            title="Akun diblokir permanen"
          />
        );
      default:
        return <StatusPill label="N/A" tone="gray" Icon={Info} title="Tidak tersedia" />;
    }
  };

  // map data_status to pill
  const renderDataStatus = (status: AccountData["data_status"]) => {
    switch (status) {
      case "verified":
        return (
          <StatusPill
            label="Verifikasi Berhasil"
            tone="green"
            Icon={CheckCircle}
            title="Data akun sudah diverifikasi"
          />
        );
      case "in_progress":
        return (
          <StatusPill
            label="Proses Pengajuan"
            tone="blue"
            Icon={Clock}
            title="Pengajuan data sedang diproses"
          />
        );
      case "rejected":
        return (
          <StatusPill
            label="Ditolak"
            tone="red"
            Icon={XCircle}
            title="Pengajuan data ditolak — perlu perbaikan"
          />
        );
      case "empty":
        return (
          <StatusPill
            label="Kosong"
            tone="gray"
            Icon={Info}
            title="Belum ada data akun"
          />
        );
      default:
        return <StatusPill label="N/A" tone="gray" Icon={Info} title="Tidak tersedia" />;
    }
  };

  const getAccountStatusText = (status: string | null) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "banned_temporary":
        return "Banned Sementara";
      case "banned_permanent":
        return "Banned Permanen";
      default:
        return status || "N/A";
    }
  };

  const getDataStatusText = (status: string | null) => {
    switch (status) {
      case "verified":
        return "Verifikasi Berhasil";
      case "in_progress":
        return "Proses Pengajuan";
      case "rejected":
        return "Ditolak";
      case "empty":
        return "Kosong";
      default:
        return status || "N/A";
    }
  };

  const handleExport = (type: "pdf" | "csv" | "print") => {
    const columns = [
      { header: "Platform", dataKey: "platform" },
      { header: "Username", dataKey: "username" },
      { header: "Email", dataKey: "email" },
      { header: "No. HP", dataKey: "phone" },
      { header: "Grup", dataKey: "group_name" },
      { header: "Status Akun", dataKey: "account_status_text" },
      { header: "Status Data", dataKey: "data_status_text" },
    ];

    const exportData = filteredAccounts.map((acc) => ({
      ...acc,
      phone: acc.phone || "-",
      group_name: acc.groups?.name || "-",
      account_status_text: getAccountStatusText(acc.account_status || null),
      data_status_text: getDataStatusText(acc.data_status || null),
    }));

    const options = {
      filename: "Daftar_Akun_Affiliate",
      title: "Laporan Daftar Akun Affiliate",
      data: exportData,
      columns,
    };

    if (type === "pdf") {
      exportToPDF(options);
    } else if (type === "csv") {
      exportToCSV(options);
    } else {
      printData(options);
    }
  };

  const shopeeCount = accounts.filter((a) => a.platform === "shopee").length;
  const tiktokCount = accounts.filter((a) => a.platform === "tiktok").length;
  const activeCount = accounts.filter((a) => a.account_status === "active").length;

  const prettyPlatform = (p: AccountData["platform"]) =>
    p === "shopee" ? "Shopee" : p === "tiktok" ? "TikTok" : p;

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
        <p className="text-sm text-muted-foreground">
          Menampilkan {filteredAccounts.length} dari {totalCount} akun
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Baris per halaman:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className={cn(currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer")}
              />
            </PaginationItem>
            
            {/* Show page numbers */}
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
                <PaginationItem key={pageNum}>
                  <PaginationLink 
                    onClick={() => setCurrentPage(pageNum)}
                    isActive={currentPage === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className={cn(currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer")}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daftar Akun Affiliate</h1>
            <p className="text-muted-foreground">
              Kelola akun Shopee dan TikTok affiliate.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={fetchAccounts}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={isExporting || filteredAccounts.length === 0}>
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
            {canManageAccounts && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setDialogs({ ...dialogs, import: true })}>
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                <Button className="gap-2" onClick={() => setDialogs({ ...dialogs, add: true })}>
                  <Plus className="h-4 w-4" />
                  Tambah Akun
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Total Akun
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : accounts.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All platforms</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-green-100">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Akun Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : activeCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {accounts.length > 0 ? `${((activeCount / accounts.length) * 100).toFixed(1)}% dari total` : "0%"}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-orange-100">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Akun Shopee
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : shopeeCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Primary platform</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-purple-100">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Akun TikTok
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : tiktokCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Secondary platform</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Card */}
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Pencarian
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search-account">Cari Akun</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-account"
                    placeholder="Cari username atau email..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Tabs value={platformFilter} onValueChange={setPlatformFilter}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">Semua</TabsTrigger>
                      <TabsTrigger value="shopee">Shopee</TabsTrigger>
                      <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Tabs value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="all">Semua</TabsTrigger>
                      <TabsTrigger value="active">Aktif</TabsTrigger>
                      <TabsTrigger value="banned_temporary">Ban Sementara</TabsTrigger>
                      <TabsTrigger value="banned_permanent">Ban Permanen</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Tabel
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    Grid
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Display */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {viewMode === "table" ? (
              <Card className="shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle>Daftar Akun</CardTitle>
                      <CardDescription>
                        Menampilkan {filteredAccounts.length} dari {totalCount} akun
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Platform</TableHead>
                          <TableHead className="whitespace-nowrap">Username</TableHead>
                          <TableHead className="whitespace-nowrap">Email</TableHead>
                          <TableHead className="whitespace-nowrap">No HP</TableHead>
                          <TableHead className="whitespace-nowrap">Grup</TableHead>
                          <TableHead className="whitespace-nowrap">Status Akun</TableHead>
                          <TableHead className="whitespace-nowrap">Status Data</TableHead>
                          {canManageAccounts && <TableHead className="whitespace-nowrap">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAccounts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={canManageAccounts ? 8 : 7} className="text-center h-24">
                              {searchTerm || platformFilter !== "all" || accountStatusFilter !== "all"
                                ? "Akun tidak ditemukan."
                                : "Belum ada data akun."}
                            </TableCell>
                          </TableRow>
                        )}
                        {filteredAccounts.map((account) => (
                          <TableRow key={account.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="whitespace-nowrap">
                              <Badge
                                variant={account.platform === "shopee" ? "default" : "secondary"}
                                className={cn(
                                  account.platform === "shopee"
                                    ? "bg-[#FF6600] hover:bg-[#FF6600]/90"
                                    : "bg-black hover:bg-black/90 text-white"
                                )}
                              >
                                {prettyPlatform(account.platform)}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {account.username.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{account.username}</span>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="truncate max-w-[200px]">{account.email}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{account.phone || "-"}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {account.groups ? (
                                <Badge variant="outline" className="px-2 py-1 rounded-full">
                                  {account.groups.name}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{renderAccountStatus(account.account_status)}</TableCell>
                            <TableCell className="whitespace-nowrap">{renderDataStatus(account.data_status)}</TableCell>
                            {canManageAccounts && (
                              <TableCell className="whitespace-nowrap">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditClick(account)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit Akun
                                    </DropdownMenuItem>
                                    {canDelete && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => handleDeleteClick(account)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Hapus Akun
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
                </CardContent>
                {filteredAccounts.length > 0 && (
                  <div className="p-4 border-t">
                    {renderPagination()}
                  </div>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAccounts.map((account) => (
                  <Card key={account.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={account.platform === "shopee" ? "default" : "secondary"}
                              className={cn(
                                account.platform === "shopee"
                                  ? "bg-[#FF6600] hover:bg-[#FF6600]/90"
                                  : "bg-black hover:bg-black/90 text-white"
                              )}
                            >
                              {prettyPlatform(account.platform)}
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              {account.created_at ? new Date(account.created_at).toLocaleDateString() : "-"}
                            </div>
                          </div>
                          <CardTitle className="text-xl">{account.username}</CardTitle>
                          <CardDescription className="line-clamp-2">{account.email}</CardDescription>
                        </div>
                        {canManageAccounts && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(account)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Akun
                              </DropdownMenuItem>
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteClick(account)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus Akun
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Status Akun:</span>
                          {renderAccountStatus(account.account_status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Status Data:</span>
                          {renderDataStatus(account.data_status)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground">No. HP</span>
                          <p className="font-medium">{account.phone || "-"}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Grup</span>
                          <p className="font-medium">{account.groups?.name || "-"}</p>
                        </div>
                      </div>
                      
                      <Button asChild className="w-full mt-2">
                        <div onClick={() => handleEditClick(account)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Akun
                        </div>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && filteredAccounts.length === 0 && (
          <div className="text-center py-8">
            <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Tidak ada akun ditemukan</h3>
            <p className="text-muted-foreground">
              {searchTerm || platformFilter !== "all" || accountStatusFilter !== "all"
                ? "Coba ubah filter atau kata kunci pencarian"
                : "Belum ada data akun. Tambahkan akun baru untuk memulai."}
            </p>
            {!searchTerm && platformFilter === "all" && accountStatusFilter === "all" && canManageAccounts && (
              <Button className="mt-4" onClick={() => setDialogs({ ...dialogs, add: true })}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Akun Baru
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {canManageAccounts && (
        <>
          <AddAccountDialog
            open={dialogs.add}
            onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
            onSuccess={handleSuccess}
          />
          {dialogs.edit && (
            <EditAccountDialog
              open={!!dialogs.edit}
              onOpenChange={(open) => setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })}
              onSuccess={handleSuccess}
              account={dialogs.edit}
            />
          )}
          {canDelete && dialogs.delete && (
            <DeleteAccountAlert
              open={!!dialogs.delete}
              onOpenChange={(open) => setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })}
              onSuccess={handleSuccess}
              account={dialogs.delete}
            />
          )}
          <BulkImportDialog
            open={dialogs.import}
            onOpenChange={(open) => setDialogs({ ...dialogs, import: open })}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </MainLayout>
  );
};

export default Accounts;