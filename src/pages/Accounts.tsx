import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddAccountDialog } from "@/components/Account/AddAccountDialog";
import { EditAccountDialog } from "@/components/Account/EditAccountDialog";
import { DeleteAccountAlert } from "@/components/Account/DeleteAccountAlert";
import { BulkImportDialog } from "@/components/Account/BulkImportDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      const { data, error } = await supabase
        .from("accounts")
        .select(`
          id,
          platform,
          username,
          email,
          phone,
          account_status,
          data_status,
          groups ( name )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAccounts(data as any);
    } catch (error: any) {
      toast.error("Gagal memuat data akun.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    const results = accounts
      .filter((acc) => {
        if (platformFilter === "all") return true;
        return acc.platform === platformFilter;
      })
      .filter((acc) => {
        if (accountStatusFilter === "all") return true;
        return acc.account_status === accountStatusFilter;
      })
      .filter((acc) => {
        return (
          acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          acc.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    setFilteredAccounts(results);
  }, [searchTerm, platformFilter, accountStatusFilter, accounts]);

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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Daftar Akun Affiliate</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Kelola akun Shopee dan TikTok affiliate.
            </p>
          </div>
          {canManageAccounts && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto"
                onClick={() => setDialogs({ ...dialogs, import: true })}
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button
                className="gap-2 w-full sm:w-auto"
                onClick={() => setDialogs({ ...dialogs, add: true })}
              >
                <Plus className="h-4 w-4" />
                Tambah Akun
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : accounts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All platforms</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? "..." : activeCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Shopee Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : shopeeCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Primary platform</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                TikTok Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : tiktokCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Secondary platform</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari username atau email..."
                    className="pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2 w-full sm:w-auto"
                      disabled={isExporting || filteredAccounts.length === 0}
                    >
                      <Download className="h-4 w-4" />
                      {isExporting ? "Mengekspor..." : "Export"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={isExporting}>
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")} disabled={isExporting}>
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport("print")} disabled={isExporting}>
                      <Printer className="mr-2 h-4 w-4" />
                      Cetak Halaman
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Tabs
                  value={platformFilter}
                  onValueChange={setPlatformFilter}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">Semua</TabsTrigger>
                    <TabsTrigger value="shopee">Shopee</TabsTrigger>
                    <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Tabs
                  value={accountStatusFilter}
                  onValueChange={setAccountStatusFilter}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                      Semua
                    </TabsTrigger>
                    <TabsTrigger value="active" className="text-xs sm:text-sm">
                      Aktif
                    </TabsTrigger>
                    <TabsTrigger value="banned_temporary" className="text-xs sm:text-sm">
                      Ban Sementara
                    </TabsTrigger>
                    <TabsTrigger value="banned_permanent" className="text-xs sm:text-sm">
                      Ban Permanen
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
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
                            {searchTerm ? "Akun tidak ditemukan." : "Belum ada data akun."}
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant={
                                account.platform === "shopee" ? "default" : "secondary"
                              }
                              className={cn(
                                "px-3 py-1 rounded-full text-sm font-semibold",
                                account.platform === "shopee"
                                  ? "bg-[#FF6600] hover:bg-[#FF6600]/90 text-white"
                                  : "bg-black text-white"
                              )}
                            >
                              {prettyPlatform(account.platform)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[150px]">{account.username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="truncate max-w-[200px] inline-block">{account.email}</span>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{account.phone || "-"}</TableCell>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canManageAccounts && (
        <AddAccountDialog
          open={dialogs.add}
          onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
          onSuccess={handleSuccess}
        />
      )}

      {canManageAccounts && dialogs.edit && (
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

      {canManageAccounts && (
        <BulkImportDialog
          open={dialogs.import}
          onOpenChange={(open) => setDialogs({ ...dialogs, import: open })}
          onSuccess={handleSuccess}
        />
      )}
    </MainLayout>
  );
};

export default Accounts;
