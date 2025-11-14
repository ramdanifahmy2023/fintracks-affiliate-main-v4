// src/pages/Employees.tsx
import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusCircle, 
  MoreHorizontal, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Loader2, 
  Eye, 
  Download,
  Search,
  Upload,
  Users,
  Building,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Calendar,
  MapPin,
  Briefcase,
  Settings,
  FileText,
  Grid,
  List,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AddEmployeeDialog } from "@/components/Employee/AddEmployeeDialog"; 
import { EditEmployeeDialog } from "@/components/Employee/EditEmployeeDialog"; 
import { DeleteEmployeeAlert } from "@/components/Employee/DeleteEmployeeAlert"; 
import { EmployeeDetailDialog } from "@/components/Employee/EmployeeDetailDialog";
import { useExport } from "@/hooks/useExport"; 
import { BulkImportDialog } from "@/components/Employee/BulkImportDialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

// Tipe data gabungan
export interface EmployeeProfile {
  id: string; // employee_id
  profile_id: string; // profiles.id
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  position: string | null;
  group_name: string | null;
  group_id: string | null; 
  date_of_birth: string | null;
  address: string | null;
  created_at: string | null;
}

// TIPE DATA UNTUK FILTER
type Group = {
  id: string;
  name: string;
};

const roles = ["superadmin", "leader", "admin", "staff", "viewer"];
const statuses = ["active", "inactive"];

// TIPE DATA DIALOG
type DialogState = {
  add: boolean;
  edit: EmployeeProfile | null;
  delete: EmployeeProfile | null;
  detail: EmployeeProfile | null;
  import: boolean;
};

const Employees = () => {
  const { profile } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // View mode state
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  
  // Dialog state
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
    detail: null,
    import: false,
  });
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  
  const { exportToPDF, exportToCSV, isExporting } = useExport();

  const canManage = profile?.role === "superadmin" || profile?.role === "leader";
  const canDelete = profile?.role === "superadmin";

  // Fetch employees dengan pagination
  const fetchEmployees = useCallback(async (
    search: string, 
    groupId: string, 
    role: string, 
    status: string,
    page: number = 1
  ) => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      let query = supabase
        .from("employees")
        .select(`
          id,
          profile_id,
          position,
          group_id, 
          created_at,
          profiles!inner (
            full_name,
            email,
            role,
            phone,
            avatar_url,
            status,
            date_of_birth,
            address
          ),
          groups (
            name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (search.trim() !== "") {
        query = query.ilike('profiles.full_name', `%${search.trim()}%`);
      }
      if (groupId === "no-group") {
        query = query.is('group_id', null);
      } else if (groupId !== "all") {
        query = query.eq('group_id', groupId);
      }
      if (role !== "all") {
        query = query.eq('profiles.role', role);
      }
      if (status !== "all") {
        query = query.eq('profiles.status', status);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const formattedData: EmployeeProfile[] = data.map((emp: any) => ({
        id: emp.id,
        profile_id: emp.profile_id,
        position: emp.position,
        full_name: emp.profiles.full_name,
        email: emp.profiles.email,
        role: emp.profiles.role,
        phone: emp.profiles.phone,
        avatar_url: emp.profiles.avatar_url,
        status: emp.profiles.status,
        group_name: emp.groups?.name || "Belum ada group",
        group_id: emp.group_id, 
        date_of_birth: emp.profiles.date_of_birth,
        address: emp.profiles.address,
        created_at: emp.created_at,
      }));

      setEmployees(formattedData);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast.error("Gagal mengambil data karyawan.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase.from("groups").select("id, name");
      if (data) {
        setAvailableGroups(data);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchEmployees(searchTerm, filterGroup, filterRole, filterStatus, currentPage);
  }, [fetchEmployees, searchTerm, filterGroup, filterRole, filterStatus, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGroup, filterRole, filterStatus]);

  const getAvatarFallback = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Dialog handlers
  const handleOpenAdd = () => setDialogs(prev => ({ ...prev, add: true }));
  const handleOpenImport = () => setDialogs(prev => ({ ...prev, import: true }));
  const handleOpenDetail = (employee: EmployeeProfile) => setDialogs(prev => ({ ...prev, detail: employee }));
  const handleOpenEdit = (employee: EmployeeProfile) => setDialogs(prev => ({ ...prev, edit: employee }));
  const handleOpenDelete = (employee: EmployeeProfile) => setDialogs(prev => ({ ...prev, delete: employee }));
  
  const closeAllModals = () => {
    setDialogs({
      add: false,
      edit: null,
      delete: null,
      detail: null,
      import: false,
    });
  };
  
  const handleSuccess = () => {
    closeAllModals();
    fetchEmployees(searchTerm, filterGroup, filterRole, filterStatus, currentPage); 
  };

  const handleExport = (type: 'pdf' | 'csv') => {
    const columns = [
      { header: 'Nama Lengkap', dataKey: 'full_name' },
      { header: 'Jabatan', dataKey: 'position' },
      { header: 'Email', dataKey: 'email' },
      { header: 'No. HP', dataKey: 'phone' },
      { header: 'Alamat', dataKey: 'address' },
      { header: 'Tgl Lahir', dataKey: 'date_of_birth' },
      { header: 'Grup', dataKey: 'group_name' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Role', dataKey: 'role' },
    ];
    
    const exportData = employees.map(emp => ({
        ...emp,
        position: emp.position || '-',
        phone: emp.phone || '-',
        address: emp.address || '-',
        date_of_birth: emp.date_of_birth ? format(new Date(emp.date_of_birth), "dd MMM yyyy", { locale: indonesiaLocale }) : '-',
    }));

    const options = {
        filename: 'Daftar_Karyawan',
        title: 'Laporan Daftar Karyawan',
        data: exportData,
        columns,
    };
    
    if (type === 'pdf') {
        exportToPDF(options);
    } else {
        exportToCSV(options);
    }
  };

  // Calculate statistics
  const stats = {
    total: totalCount,
    active: employees.filter(e => e.status === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
    withGroups: employees.filter(e => e.group_id !== null).length,
    withoutGroups: employees.filter(e => e.group_id === null).length,
  };

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between w-full">
        <p className="text-sm text-muted-foreground">
          Menampilkan {employees.length} dari {totalCount} karyawan
        </p>
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

  // Grid view component
  const EmployeeGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {employees.map((emp) => (
        <Card key={emp.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={emp.avatar_url || ""} />
                  <AvatarFallback className="text-lg">
                    {getAvatarFallback(emp.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{emp.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{emp.position || "Tidak ada jabatan"}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOpenDetail(emp)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Lihat Detail
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleOpenEdit(emp)}>
                    Edit
                  </DropdownMenuItem>
                  {canDelete && (
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleOpenDelete(emp)}
                    >
                      Hapus
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{emp.email}</span>
            </div>
            {emp.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{emp.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{emp.group_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={emp.status === "active" ? "default" : "destructive"}
                className={cn(emp.status === "active" ? "bg-green-600" : "")}
              >
                {emp.status}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3.5 w-3.5" />
                <span className="capitalize">{emp.role}</span>
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Direktori Karyawan</h1>
            <p className="text-muted-foreground">
              Kelola data karyawan, group, dan hak akses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchEmployees(searchTerm, filterGroup, filterRole, filterStatus, currentPage)}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={isExporting || employees.length === 0}>
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
            {canManage && (
              <>
                <Button variant="outline" className="gap-2" onClick={handleOpenImport}>
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                <Button className="gap-2" onClick={handleOpenAdd}>
                  <PlusCircle className="h-4 w-4" />
                  Tambah Karyawan
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Karyawan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total karyawan terdaftar</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-green-100">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.active}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}% dari total` : "0%"}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-red-100">
              <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Non-Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.inactive}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? `${((stats.inactive / stats.total) * 100).toFixed(1)}% dari total` : "0%"}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-purple-100">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Dengan Group
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.withGroups}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? `${((stats.withGroups / stats.total) * 100).toFixed(1)}% dari total` : "0%"}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-orange-100">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Tanpa Group
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.withoutGroups}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? `${((stats.withoutGroups / stats.total) * 100).toFixed(1)}% dari total` : "0%"}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-name">Cari Nama Karyawan</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-name"
                    placeholder="Ketik nama karyawan..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-group">Filter Grup</Label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group" className="w-full">
                    <SelectValue placeholder="Pilih Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Group</SelectItem>
                    <SelectItem value="no-group">Belum ada group</SelectItem>
                    {availableGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-role">Filter Role</Label>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger id="filter-role" className="w-full">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Role</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-status">Filter Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" className="w-full">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee List */}
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daftar Karyawan</CardTitle>
                <CardDescription>
                  Menampilkan {employees.length} dari {totalCount} karyawan
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
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
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 p-6">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Tidak ada karyawan ditemukan</h3>
                <p className="text-muted-foreground text-center mt-1">
                  {searchTerm || filterGroup !== "all" || filterRole !== "all" || filterStatus !== "all"
                    ? "Coba ubah filter atau kata kunci pencarian"
                    : "Belum ada data karyawan. Tambahkan karyawan baru untuk memulai."}
                </p>
                {canManage && !searchTerm && filterGroup === "all" && filterRole === "all" && filterStatus === "all" && (
                  <Button className="mt-4" onClick={handleOpenAdd}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Tambah Karyawan Baru
                  </Button>
                )}
              </div>
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      {canManage && <TableHead className="text-right">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={emp.avatar_url || ""} />
                              <AvatarFallback>
                                {getAvatarFallback(emp.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{emp.full_name}</p>
                              {emp.date_of_birth && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(emp.date_of_birth), "dd MMM yyyy", { locale: indonesiaLocale })}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            {emp.position || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{emp.email}</span>
                            </div>
                            {emp.phone && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{emp.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span>{emp.group_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={emp.status === "active" ? "default" : "destructive"}
                            className={cn(emp.status === "active" ? "bg-green-600" : "")}
                          >
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            <span className="capitalize">{emp.role}</span>
                          </Badge>
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
                                <DropdownMenuItem onClick={() => handleOpenDetail(emp)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Lihat Detail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenEdit(emp)}>
                                  Edit
                                </DropdownMenuItem>
                                {canDelete && (
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleOpenDelete(emp)}
                                  >
                                    Hapus
                                  </DropdownMenuItem>
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
            ) : (
              <div className="p-6">
                <EmployeeGridView />
              </div>
            )}
          </CardContent>
          {employees.length > 0 && (
            <div className="p-4 border-t">
              {renderPagination()}
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <AddEmployeeDialog
        isOpen={dialogs.add}
        onClose={closeAllModals}
        onSuccess={handleSuccess}
      />
      
      <BulkImportDialog
        open={dialogs.import}
        onOpenChange={closeAllModals}
        onSuccess={handleSuccess}
      />

      {dialogs.edit && (
        <EditEmployeeDialog
          isOpen={!!dialogs.edit}
          onClose={closeAllModals}
          onSuccess={handleSuccess}
          employeeToEdit={dialogs.edit}
        />
      )}

      {dialogs.delete && (
        <DeleteEmployeeAlert
          isOpen={!!dialogs.delete}
          onClose={closeAllModals}
          onSuccess={handleSuccess}
          employeeToDelete={dialogs.delete}
        />
      )}
      
      {dialogs.detail && (
        <EmployeeDetailDialog
          isOpen={!!dialogs.detail}
          onClose={closeAllModals}
          employee={dialogs.detail}
        />
      )}
    </MainLayout>
  );
};

export default Employees;