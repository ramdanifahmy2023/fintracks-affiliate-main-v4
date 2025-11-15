// src/pages/AuditLogs.tsx
import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

// Tipe data Audit Log 
interface AuditLog {
    id: string;
    timestamp: string;
    user_name: string;
    action: string;
    table_name: string;
    record_id: string;
    old_data: any; // Disimpan null untuk menghindari error database
    new_data: any; // Disimpan null untuk menghindari error database
}

const actionTypes = ["INSERT", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];

const AuditLogs = () => {
    const { profile } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    // Filter States
    const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
    const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
    const [filterAction, setFilterAction] = useState('all');
    const [searchTerm, setSearchTerm] = useState(''); // Search by user or table name

    const canRead = ['superadmin', 'leader', 'admin'].includes(profile?.role || '');

    const fetchAuditLogs = useCallback(async (startDate: string, endDate: string, action: string, search: string, page: number = 1) => {
        setLoading(true);
        if (!canRead) {
            setLoading(false);
            return;
        }

        try {
            // Hitung total count terlebih dahulu
            let countQuery = supabase
                .from('audit_logs') 
                .select('id', { count: 'exact', head: true })
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (action !== 'all') {
                countQuery = countQuery.eq('action', action);
            }
            if (search.trim() !== '') {
                countQuery = countQuery.or(`profiles.full_name.ilike.%${search.trim()}%,table_name.ilike.%${search.trim()}%`);
            }
            
            const { count: totalCountResult, error: countError } = await countQuery;
            if (countError) throw countError;
            setTotalCount(totalCountResult || 0);

            // Ambil data dengan pagination
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;
            
            let query = supabase
                .from('audit_logs') 
                .select(`
                    id,
                    created_at,
                    action,
                    table_name,
                    record_id,
                    user_id,
                    profiles!inner(full_name)
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (action !== 'all') {
                query = query.eq('action', action);
            }
            if (search.trim() !== '') {
                // Filter berdasarkan user name atau table name
                query = query.or(`profiles.full_name.ilike.%${search.trim()}%,table_name.ilike.%${search.trim()}%`);
            }
            
            const { data, error } = await query;
            if (error) throw error;

            const mappedLogs: AuditLog[] = (data as any[]).map(log => ({
                id: log.id,
                timestamp: log.created_at,
                user_name: log.profiles?.full_name || 'System/Unknown',
                action: log.action,
                table_name: log.table_name,
                record_id: log.record_id,
                old_data: null, // Diset NULL untuk menghindari error database
                new_data: null, // Diset NULL untuk menghindari error database
            }));

            setLogs(mappedLogs);

        } catch (e: any) {
            console.error("Error fetching audit logs:", e);
            toast.error("Gagal memuat log audit: " + e.message);
        } finally {
            setLoading(false);
        }
    }, [canRead]);

    useEffect(() => {
        fetchAuditLogs(filterDateStart, filterDateEnd, filterAction, searchTerm, currentPage);
    }, [fetchAuditLogs, filterDateStart, filterDateEnd, filterAction, searchTerm, currentPage]);

    const formatTimestamp = (isoString: string) => {
        return format(new Date(isoString), 'dd MMM yyyy HH:mm');
    }
    
    // Helper untuk menampilkan perubahan data (dimodifikasi untuk menangani NULL dengan pesan)
    const renderChangeDetails = (oldData: any, newData: any) => {
        // Karena old_data dan new_data diset NULL di mapping, kita tampilkan pesan ini
        if (oldData === null && newData === null) {
            return <span className="text-muted-foreground italic">Detail perubahan data tidak tersedia.</span>;
        }

        // --- Logic Lama untuk perbandingan perubahan (ditinggalkan untuk future use) ---
        
        return <span className="text-muted-foreground italic">Detail tersedia (Jika database mendukung old_data/new_data).</span>;
    }

    // Reset ke halaman 1 saat filter berubah
    const handleFilterChange = () => {
        setCurrentPage(1);
    };

    // Export data ke CSV
    const exportToCSV = async () => {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    created_at,
                    action,
                    table_name,
                    record_id,
                    profiles!inner(full_name)
                `)
                .gte('created_at', filterDateStart)
                .lte('created_at', filterDateEnd)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Format data untuk CSV
            const csvData = (data as any[]).map(log => [
                format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
                log.profiles?.full_name || 'System/Unknown',
                log.action,
                log.table_name,
                log.record_id
            ]);

            // Buat CSV
            const headers = ['Tanggal', 'User', 'Aksi', 'Tabel', 'Record ID'];
            const csvContent = [
                headers.join(','),
                ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyyMMdd')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Data audit log berhasil diekspor");
        } catch (e: any) {
            console.error("Error exporting audit logs:", e);
            toast.error("Gagal mengekspor data: " + e.message);
        }
    };

    if (!canRead) {
        return (
            <MainLayout>
                <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)]">
                    <h1 className="text-2xl font-bold">Akses Ditolak</h1>
                    <p className="text-muted-foreground">Anda tidak memiliki izin untuk melihat halaman ini.</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                        <p className="text-muted-foreground">Pencatatan semua aktivitas dan perubahan data.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={exportToCSV}>
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                    </div>
                </div>

                <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filter Log Aktivitas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 dark:bg-card">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="date-start">Mulai Tgl</Label>
                                <Input 
                                    type="date" 
                                    value={filterDateStart} 
                                    onChange={e => {
                                        setFilterDateStart(e.target.value);
                                        handleFilterChange();
                                    }} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date-end">Sampai Tgl</Label>
                                <Input 
                                    type="date" 
                                    value={filterDateEnd} 
                                    onChange={e => {
                                        setFilterDateEnd(e.target.value);
                                        handleFilterChange();
                                    }} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="action-type">Tipe Aksi</Label>
                                <Select 
                                    value={filterAction} 
                                    onValueChange={(value) => {
                                        setFilterAction(value);
                                        handleFilterChange();
                                    }}
                                >
                                    <SelectTrigger id="action-type">
                                        <SelectValue placeholder="Semua Aksi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Aksi</SelectItem>
                                        {actionTypes.map(action => (
                                          <SelectItem key={action} value={action}>{action}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="search">Cari</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="User/Tabel..." 
                                        className="pl-10"
                                        value={searchTerm}
                                        onChange={e => {
                                            setSearchTerm(e.target.value);
                                            handleFilterChange();
                                        }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-lg overflow-hidden dark:bg-card dark:border-border">
                    <CardContent className="pt-6 dark:bg-card">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-muted-foreground">
                                Menampilkan {logs.length} dari {totalCount} log
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

                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Waktu</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Aksi</TableHead>
                                            <TableHead>Tabel & ID</TableHead>
                                            <TableHead className="w-1/3">Detail Perubahan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24">
                                                    Tidak ada log audit ditemukan untuk filter ini.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {logs.map(log => (
                                            <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTimestamp(log.timestamp)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-sm whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-3 w-3" />
                                                        {log.user_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        log.action === 'INSERT' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                                                        log.action === 'UPDATE' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                                                        log.action === 'DELETE' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                                                        log.action === 'LOGIN' && 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                                                        log.action === 'LOGOUT' && 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
                                                    )}>
                                                        {log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-semibold">{log.table_name}</span>
                                                    <br/>
                                                    <span className="text-xs text-muted-foreground break-all">{log.record_id?.substring(0, 8)}...</span>
                                                </TableCell>
                                                <TableCell>
                                                    {renderChangeDetails(log.old_data, log.new_data)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        
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
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}

export default AuditLogs;