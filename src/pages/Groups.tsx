// src/pages/Groups.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PlusCircle,
  Users,
  Smartphone,
  KeyRound,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Building,
  TrendingUp,
  Settings,
  Grid,
  List,
  UserCheck,
  UserX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AddGroupDialog } from "@/components/Group/AddGroupDialog";
import { DeleteGroupAlert } from "@/components/Group/DeleteGroupAlert";
import { EditGroupDialog } from "@/components/Group/EditGroupDialog";
import { cn } from "@/lib/utils";

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  employee_count: number;
  device_count: number;
  account_count: number;
  leader_name?: string;
  leader_avatar?: string;
  created_at?: string;
}

const Groups = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // State untuk dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Memanggil fungsi SQL 'get_group_stats'
      const { data, error } = await supabase.rpc("get_group_stats");
      if (error) {
        // Fallback jika RPC belum dibuat (untuk development)
        if (error.code === '42883') { 
            const { data: simpleData, error: simpleError } = await supabase.from("groups").select("id, name, description, created_at");
            if (simpleError) throw simpleError;
            
            const mockedData: GroupData[] = (simpleData as any[]).map(g => ({
                ...g,
                employee_count: 0,
                device_count: 0,
                account_count: 0,
            }));
            setGroups(mockedData);
            toast.warning("Fungsi get_group_stats belum terdeteksi. Menampilkan data dasar.");
            return;
        }
        throw error;
      }
      setGroups(data || []);
    } catch (error: any) {
      toast.error("Gagal mengambil data group.", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const canManage = profile?.role === "superadmin" || profile?.role === "leader";

  const handleOpenDeleteAlert = (group: GroupData) => {
    setSelectedGroup(group);
    setIsAlertOpen(true);
  };

  const handleOpenEditDialog = (group: GroupData) => {
    setSelectedGroup(group);
    setIsEditDialogOpen(true); 
  };

  const closeAllDialogs = () => {
    setIsAddDialogOpen(false);
    setIsAlertOpen(false);
    setIsEditDialogOpen(false);
    setSelectedGroup(null);
  };

  const handleSuccess = () => {
    closeAllDialogs();
    fetchGroups();
  };

  // Filter groups based on search term
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate statistics
  const stats = {
    total: groups.length,
    totalEmployees: groups.reduce((sum, group) => sum + group.employee_count, 0),
    totalDevices: groups.reduce((sum, group) => sum + group.device_count, 0),
    totalAccounts: groups.reduce((sum, group) => sum + group.account_count, 0),
  };

  // Grid view component
  const GroupGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredGroups.map((group) => (
        <Card key={group.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-xl mb-1">
                  <Link 
                    to={`/groups/${group.id}`} 
                    className="hover:text-primary transition-colors"
                  >
                    {group.name}
                  </Link>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {group.description || "Tidak ada deskripsi."}
                </CardDescription>
              </div>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/groups/${group.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Lihat Detail
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleOpenEditDialog(group)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Group
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleOpenDeleteAlert(group)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Hapus Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.leader_name && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={group.leader_avatar || ""} />
                  <AvatarFallback>
                    {group.leader_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Leader</p>
                  <p className="text-sm text-muted-foreground">{group.leader_name}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-md">
                <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <p className="text-lg font-bold">{group.employee_count}</p>
                <p className="text-xs text-muted-foreground">Karyawan</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-md">
                <Smartphone className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <p className="text-lg font-bold">{group.device_count}</p>
                <p className="text-xs text-muted-foreground">Device</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-md">
                <KeyRound className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <p className="text-lg font-bold">{group.account_count}</p>
                <p className="text-xs text-muted-foreground">Akun</p>
              </div>
            </div>
            
            <Button asChild className="w-full mt-2">
              <Link to={`/groups/${group.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                Lihat Detail
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Table view component
  const GroupTableView = () => (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Group</CardTitle>
        <CardDescription>
          Menampilkan {filteredGroups.length} dari {groups.length} group
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium">Nama Group</th>
                <th className="text-left p-4 font-medium">Deskripsi</th>
                <th className="text-center p-4 font-medium">Karyawan</th>
                <th className="text-center p-4 font-medium">Device</th>
                <th className="text-center p-4 font-medium">Akun</th>
                {canManage && <th className="text-right p-4 font-medium">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => (
                <tr key={group.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <div>
                      <Link 
                        to={`/groups/${group.id}`} 
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {group.name}
                      </Link>
                      {group.leader_name && (
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={group.leader_avatar || ""} />
                            <AvatarFallback className="text-xs">
                              {group.leader_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{group.leader_name}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {group.description || "Tidak ada deskripsi"}
                    </p>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{group.employee_count}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Smartphone className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{group.device_count}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <KeyRound className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">{group.account_count}</span>
                    </div>
                  </td>
                  {canManage && (
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/groups/${group.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat Detail
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(group)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Group
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleOpenDeleteAlert(group)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredGroups.length === 0 && !loading && (
          <div className="text-center py-8">
            <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Tidak ada group ditemukan</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Coba ubah kata kunci pencarian" : "Belum ada data group. Tambahkan group baru untuk memulai."}
            </p>
            {!searchTerm && canManage && (
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Tambah Group Baru
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Group</h1>
            <p className="text-muted-foreground">
              Kelola tim, device, dan akun affiliate Anda.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={fetchGroups}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {canManage && (
              <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                Tambah Group Baru
              </Button>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Total Group
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total group terdaftar</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-green-100">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Karyawan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalEmployees}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total karyawan di semua group</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-purple-100">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Total Device
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalDevices}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total device di semua group</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-orange-100">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Total Akun
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalAccounts}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total akun di semua group</p>
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
                <Label htmlFor="search-group">Cari Group</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-group"
                    placeholder="Ketik nama group..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4 mr-2" />
                  Tabel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Groups Display */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {viewMode === "grid" ? <GroupGridView /> : <GroupTableView />}
          </>
        )}

        {/* Dialogs */}
        {canManage && (
          <>
            <AddGroupDialog
              isOpen={isAddDialogOpen}
              onClose={closeAllDialogs}
              onSuccess={handleSuccess}
            />
            <DeleteGroupAlert
              isOpen={isAlertOpen}
              onClose={closeAllDialogs}
              group={selectedGroup}
              onSuccess={handleSuccess}
            />
            <EditGroupDialog
              isOpen={isEditDialogOpen}
              onClose={closeAllDialogs}
              group={selectedGroup}
              onSuccess={handleSuccess}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Groups;