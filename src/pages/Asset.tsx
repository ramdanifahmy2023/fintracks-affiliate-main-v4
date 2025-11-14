import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Download,
  Loader2,
  DollarSign,
  Archive,
  PieChart as PieIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  Filter,
  TrendingUp,
  Package,
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
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { id as indonesianLocale } from "date-fns/locale";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer, 
} from "recharts";
import { AddAssetDialog } from "@/components/Asset/AddAssetDialog";
import { EditAssetDialog } from "@/components/Asset/EditAssetDialog"; 
import { DeleteAssetAlert } from "@/components/Asset/DeleteAssetAlert"; 
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Tipe data dari Supabase (Query lengkap untuk Edit)
export type AssetData = {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_price: number;
  condition: string | null;
  assigned_to: string | null; 
  notes: string | null; 
};

// Tipe untuk data Pie Chart
type ChartData = {
  name: string;
  value: number;
};

// Warna Chart 
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const Assets = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<AssetData[]>([]); // Master list
  const [filteredAssets, setFilteredAssets] = useState<AssetData[]>([]); // List yang ditampilkan
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- STATE BARU UNTUK FILTER KATEGORI ---
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  // ------------------------------------------


  // --- State untuk Modal/Dialog ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
  // ---------------------------------
  
  // INISIALISASI HOOK EXPORT
  const { exportToPDF, exportToCSV, isExporting } = useExport();


  const canManageAssets =
    profile?.role === "superadmin" || profile?.role === "admin";
    
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`), "dd MMM yyyy", { locale: indonesianLocale });
    } catch (e) { return "-"; }
  }

  const fetchAssets = async () => {
    setLoading(true);
    try {
      // Query semua field yg dibutuhkan untuk Edit, dan tambahkan join untuk Assigned To
      const { data, error } = await supabase
        .from("assets")
        .select(`
          id,
          name,
          category,
          purchase_date,
          purchase_price,
          condition,
          assigned_to,
          notes,
          employees ( profiles ( full_name ) ) 
        `)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      
      // Map data untuk menyertakan nama karyawan
      const mappedData = data.map((asset: any) => ({
          ...asset,
          assigned_to_name: asset.employees?.profiles?.full_name || '-',
      })) as (AssetData & { assigned_to_name: string })[]; // Gabungkan tipe data

      setAssets(mappedData);
      
      const dataForFilter = mappedData;
      
      // KUMPULKAN KATEGORI UNIK
      const uniqueCategories = Array.from(new Set(dataForFilter.map(d => d.category)));
      setAvailableCategories(uniqueCategories.sort());
      
      // Hitung breakdown untuk Pie Chart berdasarkan TOTAL NILAI ASET
      const breakdown: { [key: string]: number } = {};
      dataForFilter.forEach(asset => {
        // Menggunakan purchase_price (yang sudah merupakan nilai total)
        breakdown[asset.category] = (breakdown[asset.category] || 0) + asset.purchase_price; 
      });
      
      setChartData(Object.entries(breakdown)
          .filter(([, value]) => value > 0)
          .map(([name, value]) => ({ name, value }))
      );
      
      // Update filtered list (setelah fetch)
      setFilteredAssets(dataForFilter);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Memuat Data",
        description: "Terjadi kesalahan saat memuat data aset."
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);
  
  // ✅ LOGIKA FILTER LOKAL YANG DIPERBARUI
  useEffect(() => {
    const results = assets
      .filter((asset) => {
        // Filter berdasarkan Kategori
        if (categoryFilter !== 'all' && asset.category !== categoryFilter) {
          return false;
        }

        // Filter berdasarkan Search Term (Nama atau Kategori)
        return (
          asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      
    setFilteredAssets(results);
  }, [searchTerm, categoryFilter, assets]);


  // --- Fungsi helper untuk buka modal ---
  const handleEditClick = (asset: AssetData) => {
    setSelectedAsset(asset);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (asset: AssetData) => {
    setSelectedAsset(asset);
    setIsDeleteAlertOpen(true);
  };

  const handleSuccess = () => {
     // Tutup semua modal dan refresh data
     setIsAddModalOpen(false);
     setIsEditModalOpen(false);
     setIsDeleteAlertOpen(false);
     setSelectedAsset(null);
     fetchAssets();
  };
  
  // FUNGSI EXPORT BARU
  const exportAssets = (type: 'pdf' | 'csv') => {
    const columns = [
      { header: 'Nama Aset', dataKey: 'name' },
      { header: 'Kategori', dataKey: 'category' },
      { header: 'Tgl Beli', dataKey: 'purchase_date_formatted' },
      { header: 'Total Harga (Rp)', dataKey: 'purchase_price_formatted' }, // Changed Header
      { header: 'Kondisi', dataKey: 'condition' },
      { header: 'Diberikan Kepada', dataKey: 'assigned_to_name' },
      { header: 'Catatan', dataKey: 'notes' },
    ];
    
    // Siapkan data untuk export
    const exportData = filteredAssets.map(a => ({
        ...a,
        purchase_date_formatted: formatDate(a.purchase_date),
        purchase_price_formatted: formatCurrency(a.purchase_price), 
        condition: a.condition || '-',
        notes: a.notes || '-',
        // assigned_to_name sudah ditambahkan saat fetch
    }));

    const options = {
        filename: 'Laporan_Inventaris_Aset',
        title: 'Laporan Inventaris Aset Perusahaan',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else {
        exportToCSV(options);
    }
  };


  const totalValue = assets.reduce((acc, asset) => acc + (asset.purchase_price || 0), 0);
  const totalItems = assets.length; 

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Section dengan Background Gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Manajemen Aset</h1>
              <p className="text-blue-100 mt-1">
                Kelola inventaris aset perusahaan dengan mudah dan efisien.
              </p>
            </div>
            {canManageAssets && (
              <Button className="gap-2 w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 shadow-md" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Tambah Aset
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards dengan Desain yang Lebih Menarik */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-green-500 rounded-md">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                Total Nilai Aset 
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(totalValue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Nilai total semua aset perusahaan</p>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 rounded-md">
                  <Package className="h-4 w-4 text-white" />
                </div>
                Jumlah Item Aset
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                 {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalItems}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total item inventaris yang terdaftar</p>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 bg-purple-500 rounded-md">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                Kategori Aset
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : chartData.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Jumlah kategori yang terdaftar</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table dengan Desain yang Lebih Modern */}
          <Card className="lg:col-span-2 shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Filter className="h-4 w-4" />
                  Filter:
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                  {/* ✅ FILTER KATEGORI BARU */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Semua Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {availableCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* --------------------------- */}
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama aset..."
                      className="pl-10 w-full border-slate-200 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                   {/* DROP DOWN MENU UNTUK EXPORT */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 bg-white hover:bg-slate-50 border-slate-200" disabled={isExporting || filteredAssets.length === 0}>
                            <Download className="h-4 w-4" />
                            {isExporting ? 'Mengekspor...' : 'Export'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => exportAssets('pdf')} disabled={isExporting}>
                            Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportAssets('csv')} disabled={isExporting}>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-medium text-slate-700">Tanggal Beli</TableHead>
                        <TableHead className="font-medium text-slate-700">Nama Aset</TableHead>
                        <TableHead className="font-medium text-slate-700">Kategori</TableHead>
                        <TableHead className="font-medium text-slate-700">Diberikan Kepada</TableHead>
                        <TableHead className="font-medium text-slate-700">Kondisi</TableHead>
                        <TableHead className="text-right font-medium text-slate-700">Total Harga</TableHead>
                        <TableHead className="text-center font-medium text-slate-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                            {searchTerm || categoryFilter !== 'all' ? "Aset tidak ditemukan." : "Belum ada data aset."}
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {filteredAssets.map((asset) => (
                        <TableRow key={asset.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium">{formatDate(asset.purchase_date)}</TableCell>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{asset.category}</Badge>
                          </TableCell>
                          <TableCell>{(asset as any).assigned_to_name || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={asset.condition === "Baru" ? "default" : (asset.condition === "Bekas" ? "secondary" : "outline")}
                              className={cn(
                                asset.condition === "Baru" ? "bg-green-600 hover:bg-green-600/90" : "",
                                asset.condition === "Bekas" ? "bg-amber-100 text-amber-800 hover:bg-amber-100/80" : ""
                              )}
                            >
                              {asset.condition || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(asset.purchase_price)}</TableCell>
                          <TableCell className="text-center">
                            {canManageAssets ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border-slate-200">
                                  <DropdownMenuItem onClick={() => handleEditClick(asset)} className="hover:bg-blue-50 focus:bg-blue-50">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive hover:bg-red-50 focus:bg-red-50"
                                    onClick={() => handleDeleteClick(asset)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span>-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Pie Chart dengan Desain yang Lebih Menarik */}
          <Card className="shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-purple-600" />
                Breakdown Aset by Nilai (Rp)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => `${formatCurrency(value)}`} // Menampilkan nilai Rupiah
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <PieIcon className="h-12 w-12 mb-2 text-slate-300" />
                  <p>Belum ada data untuk ditampilkan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* --- Render Semua Dialog --- */}
       {canManageAssets && (
         <>
           {/* Tambah Aset Dialog */}
           <AddAssetDialog
             open={isAddModalOpen}
             onOpenChange={setIsAddModalOpen}
             onSuccess={handleSuccess}
           />
           
           {/* Edit Aset Dialog */}
           {selectedAsset && (
             <EditAssetDialog
               open={isEditModalOpen}
               onOpenChange={setIsEditModalOpen}
               asset={selectedAsset}
               onSuccess={handleSuccess}
             />
           )}
           
           {/* Delete Aset Alert */}
           {selectedAsset && (
             <DeleteAssetAlert
               open={isDeleteAlertOpen}
               onOpenChange={setIsDeleteAlertOpen}
               asset={selectedAsset}
               onSuccess={handleSuccess}
             />
           )}
         </>
       )}
       {/* --------------------------- */}
    </MainLayout>
  );
};

export default Assets;