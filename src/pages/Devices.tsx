// src/pages/Devices.tsx
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
  Plus,
  Search,
  Smartphone,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  DollarSign,
  Archive,
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
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
import { format } from "date-fns";

import { useExport } from "@/hooks/useExport";
import { AddDeviceDialog } from "@/components/Device/AddDeviceDialog";
import { EditDeviceDialog } from "@/components/Device/EditDeviceDialog"; 
import { DeleteDeviceAlert } from "@/components/Device/DeleteDeviceAlert"; 
import { cn } from "@/lib/utils";

// Tipe data untuk device (Diperbarui untuk mencakup semua field yang di-fetch)
type DeviceData = {
  id: string;
  device_id: string;
  imei: string;
  google_account: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  screenshot_url: string | null;
  group_id: string | null; 
  groups: { 
    name: string;
  } | null;
};

// TIPE DATA BARU UNTUK FILTER
type Group = {
  id: string;
  name: string;
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: DeviceData | null;
  delete: DeviceData | null;
};

const Devices = () => {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<DeviceData[]>([]); // Master list
  const [filteredDevices, setFilteredDevices] = useState<DeviceData[]>([]); // List yang ditampilkan
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });

  const { exportToPDF, exportToCSV, isExporting, printData } = useExport();

  const canManageDevices =
    profile?.role === "superadmin" || profile?.role === "leader";
  const canDelete = profile?.role === "superadmin";

  const formatCurrency = (amount: number | null) => {
    if (amount === null || isNaN(amount)) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(`${dateString}T00:00:00`), "dd MMM yyyy");
    } catch (e) {
      return "-";
    }
  };

  const fetchDevices = useCallback(async (
    page: number = 1,
    group: string = "all",
    search: string = ""
  ) => {
    setLoading(true);
    try {
      // Hitung total count terlebih dahulu
      let countQuery = supabase
        .from("devices")
        .select("id", { count: "exact", head: true });

      if (group !== "all") {
        countQuery = countQuery.eq("group_id", group);
      }
      
      if (search.trim() !== "") {
        countQuery = countQuery.or(`device_id.ilike.%${search.trim()}%,imei.ilike.%${search.trim()}%,google_account.ilike.%${search.trim()}%`);
      }
      
      const { count: totalCountResult, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(totalCountResult || 0);

      // Ambil data dengan pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("devices")
        .select(`
          id,
          device_id,
          imei,
          google_account,
          purchase_date,
          purchase_price,
          screenshot_url,
          group_id,
          groups ( name )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Filter berdasarkan grup
      if (group !== "all") {
        query = query.eq("group_id", group);
      }
      
      // Filter berdasarkan search term
      if (search.trim() !== "") {
        query = query.or(`device_id.ilike.%${search.trim()}%,imei.ilike.%${search.trim()}%,google_account.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setDevices(data as any);
      setFilteredDevices(data as any);

    } catch (error: any) {
      toast.error("Gagal memuat data device.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data saat halaman dimuat
  useEffect(() => {
    fetchDevices(currentPage, filterGroup, searchTerm);
    
    // Ambil daftar grup untuk filter
    const fetchGroups = async () => {
      const { data } = await supabase.from("groups").select("id, name");
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

  // Fetch data saat filter berubah
  useEffect(() => {
    fetchDevices(currentPage, filterGroup, searchTerm);
  }, [currentPage, filterGroup, searchTerm, fetchDevices]);

  const handleEditClick = (device: DeviceData) => {
    setDialogs({ ...dialogs, edit: device });
  };

  const handleDeleteClick = (device: DeviceData) => {
    setDialogs({ ...dialogs, delete: device });
  };
  
  const handleSuccess = () => {
     setDialogs({ add: false, edit: null, delete: null });
     fetchDevices(currentPage, filterGroup, searchTerm);
  }

  // Kalkulasi summary dari master list (bukan data terfilter)
  const fetchSummaryData = useCallback(async () => {
    try {
      const { data: allDevices } = await supabase
        .from("devices")
        .select("purchase_price, group_id, groups(name)");
      
      const totalInvestment = (allDevices as any[]).reduce((acc, d) => acc + (d.purchase_price || 0), 0);
      const allocatedCount = (allDevices as any[]).filter(d => d.groups).length;
      
      // Update state summary
      // Anda bisa menambahkan state baru untuk summary jika perlu
    } catch (error) {
      console.error("Error fetching summary data:", error);
    }
  }, []);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  const exportDevices = (type: 'pdf' | 'csv' | 'print') => {
    const columns = [
      { header: 'No', dataKey: 'row_number' },
      { header: 'ID Device', dataKey: 'device_id' },
      { header: 'IMEI', dataKey: 'imei' },
      { header: 'Akun Google', dataKey: 'google_account' },
      { header: 'Group', dataKey: 'group_name' },
      { header: 'Tgl Beli', dataKey: 'purchase_date_formatted' },
      { header: 'Harga Beli (Rp)', dataKey: 'purchase_price_formatted' },
      { header: 'Link Bukti', dataKey: 'screenshot_url' },
    ];
    
    const exportData = filteredDevices.map((d, index) => ({
        ...d,
        row_number: (currentPage - 1) * itemsPerPage + index + 1,
        google_account: d.google_account || '-',
        group_name: d.groups?.name || '-',
        purchase_date_formatted: formatDate(d.purchase_date),
        purchase_price_formatted: formatCurrency(d.purchase_price),
        purchase_price_raw: d.purchase_price || 0,
        screenshot_url: d.screenshot_url || '-',
    }));

    const options = {
        filename: 'Inventaris_Device',
        title: 'Laporan Inventaris Device',
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
              <h1 className="text-3xl font-bold tracking-tight">Inventaris Device</h1>
              <p className="text-blue-100 mt-1">
                Kelola device tim dan alokasinya.
              </p>
            </div>
            {canManageDevices && (
              <Button
                className="gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-md"
                onClick={() => setDialogs({ ...dialogs, add: true })}
              >
                <Plus className="h-4 w-4" />
                Tambah Device
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards dengan Desain yang Lebih Menarik */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 rounded-md">
                  <Smartphone className="h-4 w-4 text-white" />
                </div>
                Total Devices
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Di semua grup
              </p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-green-500 rounded-md">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                Total Investasi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(
                  devices.reduce((acc, d) => acc + (d.purchase_price || 0), 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total nilai aset device
              </p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-purple-500 rounded-md">
                  <Archive className="h-4 w-4 text-white" />
                </div>
                Device Teralokasi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                  devices.filter(d => d.groups).length
                }
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Device yang sudah masuk grup
              </p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filter Search */}
              <div className="space-y-2">
                <Label htmlFor="search-device" className="text-sm font-medium">Cari Device</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-device"
                    placeholder="ID Device, IMEI, atau Akun Google..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleFilterChange();
                    }}
                  />
                </div>
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

              {/* Tombol Export */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Export Data</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full gap-2" disabled={isExporting || filteredDevices.length === 0}>
                      <Download className="h-4 w-4" />
                      {isExporting ? 'Mengekspor...' : 'Export'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportDevices('pdf')} disabled={isExporting}>
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportDevices('csv')} disabled={isExporting}>
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => exportDevices('print')} disabled={isExporting}>
                      <Printer className="mr-2 h-4 w-4" />
                      Cetak Halaman
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabel Data dengan Navigasi */}
        <Card className="shadow-md border-0 overflow-hidden dark:bg-card dark:border-border">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-gray-900">
            <div className="flex justify-between items-center">
              <CardTitle>Daftar Device</CardTitle>
              <div className="text-sm text-muted-foreground">
                Menampilkan {filteredDevices.length} dari {totalCount} device
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
                {/* Pagination Controls */}
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-muted-foreground">
                    Halaman {currentPage} dari {totalPages || 1}
                  </div>
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
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>Device ID</TableHead>
                        <TableHead>IMEI</TableHead>
                        <TableHead>Akun Google</TableHead>
                        <TableHead>Grup</TableHead>
                        <TableHead>Tgl. Beli</TableHead>
                        <TableHead className="text-right">Harga Beli</TableHead>
                        {canManageDevices && <TableHead className="text-right">Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDevices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={canManageDevices ? 8 : 7} className="text-center h-24">
                            {searchTerm || filterGroup !== 'all' ? "Device tidak ditemukan." : "Belum ada data device."}
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredDevices.map((device, index) => (
                        <TableRow key={device.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Smartphone className="h-4 w-4 text-primary" />
                              </div>
                              {device.device_id}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {device.imei}
                          </TableCell>
                          <TableCell className="text-sm">
                            {device.google_account || "-"}
                          </TableCell>
                          <TableCell>
                            {device.groups ? (
                              <Badge variant="outline">{device.groups.name}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(device.purchase_date)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(device.purchase_price)}
                          </TableCell>
                          {canManageDevices && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditClick(device)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => handleDeleteClick(device)}
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
      
      {canManageDevices && (
         <>
           <AddDeviceDialog
             open={dialogs.add}
             onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
             onSuccess={handleSuccess}
           />
           {dialogs.edit && (
             <EditDeviceDialog
               open={!!dialogs.edit}
               onOpenChange={(open) => setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })}
               device={dialogs.edit}
               onSuccess={handleSuccess}
             />
           )}
           {canDelete && dialogs.delete && (
             <DeleteDeviceAlert
               open={!!dialogs.delete}
               onOpenChange={(open) => setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })}
               device={dialogs.delete}
               onSuccess={handleSuccess}
             />
           )}
         </>
     )}
    </MainLayout>
  );
};

export default Devices;