import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  CalendarIcon,
  Search,
  Filter,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, intervalToDuration } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

// --- TIPE DATA BARU UNTUK MANAGEMENT VIEW ---
interface AttendanceRecord {
    id: string;
    attendance_date: string;
    check_in: string | null;
    check_out: string | null;
    status: 'present' | 'absent' | 'leave';
    employee_id: string;
    employee_name: string;
    group_name: string;
}
type Group = { id: string; name: string };
// ------------------------------------------

const Attendance = () => {
    const { profile, employee } = useAuth();
    const isStaff = profile?.role === 'staff';
    const canManage = ['superadmin', 'leader', 'admin', 'viewer'].includes(profile?.role || '');

    // --- STATES FOR STAFF VIEW ---
    const [currentStatus, setCurrentStatus] = useState<'clockedIn' | 'clockedOut' | 'loading'>('loading');

    // --- STATES FOR MANAGEMENT VIEW ---
    const [managementRecords, setManagementRecords] = useState<AttendanceRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
    const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
    const [filterGroup, setFilterGroup] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- PAGINATION STATES ---
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const recordsPerPage = 20;
    // ----------------------------
    
    // --- HELPER UNTUK FORMAT WAKTU ---
    const formatTime = (isoString: string | null) => {
        if (!isoString) return '-';
        // Hanya tampilkan waktu (HH:MM)
        return format(new Date(isoString), 'HH:mm');
    }
    const formatDateOnly = (dateString: string) => {
        if (!dateString) return '-';
        return format(new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`), 'dd MMM yyyy', { locale: indonesiaLocale });
    }
    // --- HELPER BARU: HITUNG DURASI ---
    const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
        if (!checkIn || !checkOut) return '-';
        
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        
        if (start.getTime() > end.getTime()) return '-';
        
        const duration = intervalToDuration({ start, end });
        
        let parts: string[] = [];
        if (duration.hours && duration.hours > 0) {
            parts.push(`${duration.hours} jam`);
        }
        if (duration.minutes && duration.minutes > 0) {
            parts.push(`${duration.minutes} mnt`);
        }
        
        return parts.length > 0 ? parts.join(' ') : 'Kurang dari 1 mnt';
    }
    // ---------------------------------
    
    // --- LOGIC ABSENSI STAFF ---
    const fetchMyAttendanceStatus = useCallback(async () => {
        if (!isStaff || !employee) return;
        setLoadingRecords(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        
        try {
            const { data } = await supabase
                .from('attendance')
                .select('check_in')
                .eq('employee_id', employee.id)
                .eq('attendance_date', today)
                .maybeSingle();

            if (data && data.check_in) {
                 setCurrentStatus('clockedIn');
            } else {
                 setCurrentStatus('clockedOut');
            }
        } catch(e) {
             setCurrentStatus('clockedOut');
        } finally {
             setLoadingRecords(false);
        }
    }, [isStaff, employee]);
    
    
    // --- LOGIC FETCHING DATA KEHADIRAN (Management View) ---
    const fetchAttendanceData = useCallback(async (startDate: string, endDate: string, groupId: string, search: string, page: number = 1) => {
        setLoadingRecords(true);
        try {
            // Hitung offset berdasarkan halaman saat ini
            const offset = (page - 1) * recordsPerPage;
            
            // Query untuk mendapatkan data dengan pagination
            let query = supabase
                .from('attendance')
                .select(`
                    id,
                    attendance_date,
                    check_in,
                    check_out,
                    status,
                    employee_id,
                    employees!inner(
                        profiles!inner(full_name, role),
                        groups(name)
                    )
                `, { count: 'exact' }) // Tambahkan count untuk pagination
                .gte('attendance_date', startDate)
                .lte('attendance_date', endDate)
                .eq('employees.profiles.role', 'staff')
                .order('attendance_date', { ascending: false })
                .range(offset, offset + recordsPerPage - 1);
            
            if (groupId !== 'all') {
                query = query.eq('employees.group_id', groupId);
            }
            
            if (search.trim() !== '') {
                query = query.ilike('employees.profiles.full_name', `%${search.trim()}%`);
            }
            
            const { data, error, count } = await query;
            if (error) throw error;
            
            // Update total records dan total pages
            setTotalRecords(count || 0);
            setTotalPages(Math.ceil((count || 0) / recordsPerPage));
            
            const mappedRecords: AttendanceRecord[] = (data as any[]).map(record => ({
                id: record.id,
                attendance_date: record.attendance_date,
                check_in: record.check_in,
                check_out: record.check_out,
                status: record.status,
                employee_id: record.employee_id,
                employee_name: record.employees.profiles.full_name,
                group_name: record.employees.groups?.name || '-',
            }));
            
            setManagementRecords(mappedRecords);

        } catch(error) {
            console.error(error);
            toast.error("Gagal memuat rincian kehadiran.");
        } finally {
            setLoadingRecords(false);
        }
    }, []);

    // --- Fetch Groups for Management Filter ---
    useEffect(() => {
        if (canManage) {
            const fetchGroups = async () => {
                const { data } = await supabase.from("groups").select("id, name");
                if (data) setAvailableGroups(data);
            };
            fetchGroups();
        }
    }, [canManage]);
    
    // --- Fetch Data on Filter Change (Management) ---
    useEffect(() => {
        if (canManage) {
            // Reset ke halaman 1 saat filter berubah
            setCurrentPage(1);
            fetchAttendanceData(filterDateStart, filterDateEnd, filterGroup, searchTerm, 1);
        }
    }, [canManage, fetchAttendanceData, filterDateStart, filterDateEnd, filterGroup, searchTerm]);

    // Fetch data saat halaman berubah
    useEffect(() => {
        if (canManage) {
            fetchAttendanceData(filterDateStart, filterDateEnd, filterGroup, searchTerm, currentPage);
        }
    }, [canManage, currentPage, fetchAttendanceData, filterDateStart, filterDateEnd, filterGroup, searchTerm]);

    // Initial fetch for staff status
    useEffect(() => {
        if (isStaff) fetchMyAttendanceStatus();
    }, [isStaff, fetchMyAttendanceStatus]);


    // --- STAFF ACTIONS (CHECK IN / CHECK OUT) ---
    const handleAction = async (action: 'checkIn' | 'checkOut') => {
        if (!isStaff || !employee) return;
        
        setLoadingRecords(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        const currentTime = new Date().toISOString();
        
        try {
            const { data: existingData, error: checkError } = await supabase
                .from('attendance')
                .select('id, check_in, check_out')
                .eq('employee_id', employee.id)
                .eq('attendance_date', today)
                .maybeSingle();

            if (checkError) throw checkError;


            if (action === 'checkIn') {
                if (existingData?.check_in) {
                     toast.warning("Anda sudah Check-in hari ini.");
                     return;
                }

                // Insert Check-in record
                const { error } = await supabase
                    .from('attendance')
                    .upsert({
                        employee_id: employee.id,
                        attendance_date: today,
                        check_in: currentTime,
                        status: 'present',
                    }, { onConflict: 'employee_id, attendance_date' });
                
                if (error) throw error;
                toast.success("Check-in berhasil!");
                setCurrentStatus('clockedIn');
                
            } else if (action === 'checkOut') {
                 if (existingData && existingData.check_out) {
                    toast.warning("Anda sudah Check-out hari ini.");
                    return;
                 }
                 if (!existingData || !existingData.check_in) {
                    toast.error("Gagal Check-out: Anda belum Check-in hari ini.");
                    return;
                 }
                
                 // Update Check-out record
                 const { error: updateError } = await supabase
                    .from('attendance')
                    .update({
                        check_out: currentTime,
                    })
                    .eq('id', existingData.id); // Update record yang sudah ada
                    
                if (updateError) throw updateError;
                toast.success("Check-out berhasil!");
                setCurrentStatus('clockedOut');
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Gagal melakukan aksi.", { description: e.message });
        } finally {
            setLoadingRecords(false);
        }
    }

    // --- PAGINATION HANDLERS ---
    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const goToPreviousPage = () => {
        goToPage(currentPage - 1);
    };

    const goToNextPage = () => {
        goToPage(currentPage + 1);
    };

    const goToFirstPage = () => {
        goToPage(1);
    };

    const goToLastPage = () => {
        goToPage(totalPages);
    };
    // -------------------------

    // --- RENDERING COMPONENTS ---

    const renderStaffView = () => (
        <div className="space-y-6">
            {/* Header Section dengan Background Gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                <h1 className="text-3xl font-bold tracking-tight">Absensi Harian Anda</h1>
                <p className="text-blue-100 mt-1">Absen in dan out sangat krusial untuk perhitungan KPI.</p>
            </div>
            
            <Card className="text-center p-8 shadow-md border-0 overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Clock className="h-5 w-5" />
                        Status Hari Ini
                    </CardTitle>
                    <CardDescription>Absen in dan out sangat krusial untuk perhitungan KPI.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingRecords ? (
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mt-6" />
                    ) : (
                        <>
                            <div className={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 mt-6", 
                                currentStatus === 'clockedIn' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            )}>
                                {currentStatus === 'clockedIn' ? (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        ANDA SUDAH CHECK-IN
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4" />
                                        ANDA BELUM CHECK-IN
                                    </>
                                )}
                            </div>
                            
                            <div className="flex justify-center gap-4">
                                <Button 
                                    size="lg" 
                                    className="gap-2 px-8 py-6 text-lg bg-green-600 hover:bg-green-700"
                                    onClick={() => handleAction('checkIn')}
                                    disabled={currentStatus === 'clockedIn' || loadingRecords}
                                >
                                    <ArrowUpRight className="h-6 w-6" />
                                    Check-in
                                </Button>
                                <Button 
                                    size="lg" 
                                    variant="outline" 
                                    className="gap-2 px-8 py-6 text-lg border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => handleAction('checkOut')}
                                    disabled={currentStatus === 'clockedOut' || loadingRecords}
                                >
                                    <ArrowDownLeft className="h-6 w-6" />
                                    Check-out
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
            
            {/* Show My Attendance History (Placeholder/Future Feature) */}
            <Card className="shadow-md border-0">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Riwayat Absensi Anda
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Riwayat absensi pribadi akan ditampilkan di sini.</p>
                </CardContent>
            </Card>
        </div>
    );
    
    const renderManagementView = () => (
        <div className="space-y-6">
            {/* Header Section dengan Background Gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                <h1 className="text-3xl font-bold tracking-tight">Rincian Kehadiran Staff</h1>
                <p className="text-blue-100 mt-1">Pantau dan kelola kehadiran staff untuk produktivitas yang optimal.</p>
            </div>
            
            {/* Filter Section dengan Desain yang Lebih Menarik */}
            <Card className="shadow-md border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Filter className="h-5 w-5 text-slate-600" />
                        Filter Kehadiran Staff
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                           <Label htmlFor="date-start" className="text-sm font-medium">Mulai Tgl</Label>
                           <Input 
                               type="date" 
                               value={filterDateStart} 
                               onChange={e => setFilterDateStart(e.target.value)}
                               className="border-slate-200 focus:border-blue-500"
                           />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="date-end" className="text-sm font-medium">Sampai Tgl</Label>
                           <Input 
                               type="date" 
                               value={filterDateEnd} 
                               onChange={e => setFilterDateEnd(e.target.value)}
                               className="border-slate-200 focus:border-blue-500"
                           />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="filter-group" className="text-sm font-medium">Group</Label>
                            <Select value={filterGroup} onValueChange={setFilterGroup}>
                                <SelectTrigger id="filter-group" className="border-slate-200">
                                    <SelectValue placeholder="Semua Group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Group</SelectItem>
                                    {availableGroups.map(group => (
                                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="search-name" className="text-sm font-medium">Cari Staff</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Cari nama staff..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-10 border-slate-200 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Tabel Data Kehadiran */}
            <Card className="shadow-md border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Rekap Absensi Staff
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                            Menampilkan {managementRecords.length} dari {totalRecords} data
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingRecords ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                    ) : (
                         <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-medium text-slate-700">Tanggal</TableHead>
                                            <TableHead className="font-medium text-slate-700">Nama Staff</TableHead>
                                            <TableHead className="font-medium text-slate-700">Group</TableHead>
                                            <TableHead className="font-medium text-slate-700">Check-in</TableHead>
                                            <TableHead className="font-medium text-slate-700">Check-out</TableHead>
                                            <TableHead className="font-medium text-slate-700">Durasi</TableHead>
                                            <TableHead className="font-medium text-slate-700">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {managementRecords.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                                    Tidak ada data kehadiran staff ditemukan.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {managementRecords.map(record => (
                                            <TableRow key={record.id} className="hover:bg-slate-50 transition-colors">
                                                <TableCell className="font-medium">{formatDateOnly(record.attendance_date)}</TableCell>
                                                <TableCell className="font-medium">{record.employee_name}</TableCell>
                                                <TableCell>{record.group_name}</TableCell>
                                                <TableCell>{formatTime(record.check_in)}</TableCell>
                                                <TableCell>{formatTime(record.check_out)}</TableCell>
                                                <TableCell>{calculateDuration(record.check_in, record.check_out)}</TableCell>
                                                <TableCell>
                                                     <Badge 
                                                         variant={record.status === 'present' ? 'default' : 'secondary'} 
                                                         className={cn(
                                                             record.status === 'present' ? 'bg-green-600 hover:bg-green-600/90' : '',
                                                             'whitespace-nowrap'
                                                         )}
                                                     >
                                                        {record.status}
                                                     </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {/* Pagination Component */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t">
                                    <div className="text-sm text-muted-foreground">
                                        Halaman {currentPage} dari {totalPages} (Total {totalRecords} data)
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToFirstPage}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToPreviousPage}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        
                                        <div className="flex items-center space-x-1">
                                            {/* Show current page and one page before/after */}
                                            {currentPage > 2 && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => goToPage(1)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        1
                                                    </Button>
                                                    {currentPage > 3 && <span className="px-1">...</span>}
                                                </>
                                            )}
                                            
                                            {currentPage > 1 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => goToPage(currentPage - 1)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    {currentPage - 1}
                                                </Button>
                                            )}
                                            
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => goToPage(currentPage)}
                                                className="h-8 w-8 p-0"
                                            >
                                                {currentPage}
                                            </Button>
                                            
                                            {currentPage < totalPages && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => goToPage(currentPage + 1)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    {currentPage + 1}
                                                </Button>
                                            )}
                                            
                                            {currentPage < totalPages - 1 && (
                                                <>
                                                    {currentPage < totalPages - 2 && <span className="px-1">...</span>}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => goToPage(totalPages)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        {totalPages}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                        
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToNextPage}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToLastPage}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                         </>
                    )}
                </CardContent>
            </Card>
        </div>
    );


    return (
        <MainLayout>
            {isStaff ? renderStaffView() : renderManagementView()}
        </MainLayout>
    );
}

export default Attendance;