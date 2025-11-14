import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Loader2, 
  BookOpen, 
  Video, 
  FileText, 
  Link as LinkIcon, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  User,
  Tag,
  Folder,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"; 
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { AddKnowledgeDialog } from "@/components/Knowledge/AddKnowledgeDialog";
import { EditKnowledgeDialog } from "@/components/Knowledge/EditKnowledgeDialog"; 
import { DeleteKnowledgeAlert } from "@/components/Knowledge/DeleteKnowledgeAlert"; 
import { cn } from "@/lib/utils";

// Tipe data dari Supabase
type KnowledgeData = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  created_at: string;
  created_by: string | null; 
  profiles: {
    full_name: string;
  } | null;
};

// Tipe data yang sudah diproses
export type ProcessedKnowledgeData = Omit<KnowledgeData, 'tags'> & {
  type: "YouTube" | "Google Drive" | "Teks";
  tags: string[];
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: ProcessedKnowledgeData | null;
  delete: ProcessedKnowledgeData | null;
};

// Helper untuk render konten
const RenderContent = ({ item, isExpanded }: { item: ProcessedKnowledgeData, isExpanded: boolean }) => {
  // --- KUNCI: Render IFRAME hanya jika isExpanded true ---
  if (item.type === "YouTube" && isExpanded) {
    return (
      <div className="aspect-video w-full">
        <iframe
          src={item.content}
          title={item.title}
          className="w-full h-full rounded-md border"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }
  
  if (item.type === "Google Drive" && isExpanded) {
     // Gunakan iframe untuk embedding Google Drive (jika URL sudah diformat ke /preview)
      return (
        <div className="aspect-video w-full">
          <iframe
            src={item.content}
            title={item.title}
            className="w-full h-full rounded-md border"
            allowFullScreen
          ></iframe>
        </div>
      );
  }
  
  // Jika konten adalah link (YouTube/Drive) tapi Accordion tidak expand, tampilkan link
  if ((item.type === "YouTube" || item.type === "Google Drive") && !isExpanded) {
      return (
         <a href={item.content} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-2">
             <LinkIcon className="h-4 w-4" />
             Lihat {item.type} (Buka untuk melihat)
         </a>
      );
  }
  
  if (item.type === "Teks") {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-muted/50">
        <p>{item.content}</p> 
        {/* TODO: Ganti <p> dengan parser Markdown jika ingin lebih canggih */}
      </div>
    );
  }

  return <p className="text-muted-foreground">Tipe konten tidak dikenali.</p>;
};

const Knowledge = () => {
  const { profile } = useAuth();
  const [knowledgeBase, setKnowledgeBase] = useState<ProcessedKnowledgeData[]>([]);
  const [groupedKnowledge, setGroupedKnowledge] = useState<Record<string, ProcessedKnowledgeData[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
  // --- PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const recordsPerPage = 10; // Kurangi dari 20 untuk tampilan accordion yang lebih baik
  // ----------------------------
  
  // State untuk Dialogs
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });
  // State untuk melacak item Accordion yang sedang dibuka
  const [expandedItem, setExpandedItem] = useState<string | undefined>(undefined); // PERBAIKAN: Inisialisasi dengan undefined

  // Cek hak akses
  const canManage = profile?.role === "superadmin";

  // Fetch data
  const fetchData = async (page: number = 1) => {
    setLoading(true);
    try {
      // Hitung offset berdasarkan halaman saat ini
      const offset = (page - 1) * recordsPerPage;
      
      // Query untuk mendapatkan data dengan pagination
      const { data, error, count } = await supabase
        .from("knowledge_base")
        .select(`
          id,
          title,
          content,
          category,
          tags,
          created_at,
          created_by,
          profiles ( full_name )
        `, { count: 'exact' })
        .order("created_at", { ascending: false })
        .range(offset, offset + recordsPerPage - 1);

      if (error) throw error;
      
      // Update total records dan total pages
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / recordsPerPage));

      // Proses data (Ekstrak 'type' dari tags)
      const processedData: ProcessedKnowledgeData[] = (data as KnowledgeData[]).map(item => {
        let type: ProcessedKnowledgeData["type"] = "Teks"; 
        const tags = item.tags || [];
        
        const typeTag = tags.find(t => t.startsWith("__type:"));
        if (typeTag) {
          type = typeTag.split(":")[1] as ProcessedKnowledgeData["type"];
        } else {
             // Fallback: Jika tidak ada tag tipe, coba deteksi dari URL
            if (item.content.includes("youtube.com") || item.content.includes("youtu.be")) {
                type = "YouTube";
            } else if (item.content.includes("docs.google.com") || item.content.includes("drive.google.com")) {
                type = "Google Drive";
            }
        }
        
        return {
          ...item,
          type: type,
          tags: tags.filter(t => !t.startsWith("__type:")), // Tags bersih
        } as ProcessedKnowledgeData;
      });
      
      setKnowledgeBase(processedData);
      
      // Extract categories untuk filter
      const categories = Array.from(new Set(processedData.map(item => item.category || "Lainnya")));
      setAvailableCategories(categories.sort());
      
    } catch (error: any) {
      toast.error("Gagal memuat materi SOP.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all data for filtering (tanpa pagination)
  const fetchAllData = async () => {
    try {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select(`
          id,
          title,
          content,
          category,
          tags,
          created_at,
          created_by,
          profiles ( full_name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Proses data (Ekstrak 'type' dari tags)
      const processedData: ProcessedKnowledgeData[] = (data as KnowledgeData[]).map(item => {
        let type: ProcessedKnowledgeData["type"] = "Teks"; 
        const tags = item.tags || [];
        
        const typeTag = tags.find(t => t.startsWith("__type:"));
        if (typeTag) {
          type = typeTag.split(":")[1] as ProcessedKnowledgeData["type"];
        } else {
             // Fallback: Jika tidak ada tag tipe, coba deteksi dari URL
            if (item.content.includes("youtube.com") || item.content.includes("youtu.be")) {
                type = "YouTube";
            } else if (item.content.includes("docs.google.com") || item.content.includes("drive.google.com")) {
                type = "Google Drive";
            }
        }
        
        return {
          ...item,
          type: type,
          tags: tags.filter(t => !t.startsWith("__type:")), // Tags bersih
        } as ProcessedKnowledgeData;
      });
      
      setKnowledgeBase(processedData);
      
      // Extract categories untuk filter
      const categories = Array.from(new Set(processedData.map(item => item.category || "Lainnya")));
      setAvailableCategories(categories.sort());
      
    } catch (error: any) {
      toast.error("Gagal memuat materi SOP.");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);
  
  // LOGIKA FILTER DAN GROUPING
  useEffect(() => {
      // Fetch all data untuk filtering
      fetchAllData();
  }, [profile]);
  
  useEffect(() => {
      let filteredData = knowledgeBase.filter(item => {
          const searchLower = searchTerm.toLowerCase();
          return item.title.toLowerCase().includes(searchLower) ||
                 item.category.toLowerCase().includes(searchLower) ||
                 item.tags.some(tag => tag.toLowerCase().includes(searchLower));
      });
      
      // Filter by category
      if (filterCategory !== "all") {
          filteredData = filteredData.filter(item => item.category === filterCategory);
      }

      // Kelompokkan data yang sudah difilter berdasarkan kategori
      const groups: Record<string, ProcessedKnowledgeData[]> = {};
      for (const item of filteredData) {
        const category = item.category || "Lainnya";
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(item);
      }
      setGroupedKnowledge(groups);
      
      // Update total records for pagination
      const totalFilteredItems = Object.values(groups).reduce((acc, items) => acc + items.length, 0);
      setTotalRecords(totalFilteredItems);
      setTotalPages(Math.ceil(totalFilteredItems / recordsPerPage));
      
      // Reset to page 1 if current page is out of bounds
      if (currentPage > Math.ceil(totalFilteredItems / recordsPerPage)) {
        setCurrentPage(1);
      }

  }, [searchTerm, knowledgeBase, filterCategory, currentPage]);

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

  const handleEditClick = (item: ProcessedKnowledgeData) => {
    setDialogs({ ...dialogs, edit: item });
  };
  
  const handleDeleteClick = (item: ProcessedKnowledgeData) => {
    setDialogs({ ...dialogs, delete: item });
  };
  
  const handleSuccess = () => {
     setDialogs({ add: false, edit: null, delete: null });
     fetchData(); // Refresh data
  }
  
  const handleAccordionChange = (value: string | undefined) => {
      // Toggle logic: Jika nilai yang sama diklik, tutup (set undefined)
      setExpandedItem(value === expandedItem ? undefined : value);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Section dengan Background Gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">SOP & Knowledge Center</h1>
              <p className="text-blue-100 mt-1">Pusat tutorial, SOP, dan kebijakan perusahaan.</p>
            </div>
            {canManage && (
              <Button className="gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-md" onClick={() => setDialogs({ ...dialogs, add: true })}>
                <Plus className="h-4 w-4" />
                Tambah Materi Baru
              </Button>
            )}
          </div>
        </div>
        
        {/* Filter Section dengan Desain yang Lebih Menarik */}
        <Card className="shadow-md border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-slate-600" />
              Filter Knowledge Base
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium">Cari Materi</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Cari Judul, Kategori, atau Tags..."
                    className="pl-10 border-slate-200 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">Kategori</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger id="category" className="border-slate-200">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {availableCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(groupedKnowledge).length === 0 ? (
               <Card className="shadow-md border-0">
                 <CardContent className="pt-6 text-center text-muted-foreground">
                   {searchTerm || filterCategory !== "all" ? "Materi tidak ditemukan." : "Belum ada materi SOP atau tutorial yang ditambahkan."}
                 </CardContent>
               </Card>
            ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan {Object.values(groupedKnowledge).flat().length} dari {totalRecords} materi
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
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
                    )}
                  </div>
                  
                  <Accordion 
                    type="single" 
                    collapsible 
                    // Gunakan expandedItem sebagai value untuk mengontrol satu Accordion terbuka
                    value={expandedItem} 
                    onValueChange={handleAccordionChange}
                  >
                    {Object.entries(groupedKnowledge).map(([category, items]) => (
                      <AccordionItem value={category} key={category} className="border-slate-200">
                        <AccordionTrigger 
                           className="text-xl font-semibold hover:no-underline px-4 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="h-5 w-5 text-slate-600" />
                            {category} ({items.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          {items.map(item => (
                            <Card key={item.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                              <CardHeader className="relative bg-gradient-to-r from-gray-50 to-slate-50">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  {item.type === 'YouTube' && <Video className="h-5 w-5 text-red-500" />}
                                  {item.type === 'Google Drive' && <LinkIcon className="h-5 w-5 text-blue-500" />}
                                  {item.type === 'Teks' && <FileText className="h-5 w-5 text-slate-600" />}
                                  {item.title}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {item.profiles?.full_name || 'Sistem'}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(item.created_at), "dd MMM yyyy", { locale: indonesiaLocale })}
                                  </div>
                                </CardDescription>
                                {canManage && (
                                  <div className="absolute right-4 top-4">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="border-slate-200">
                                        <DropdownMenuItem onClick={() => handleEditClick(item)} className="hover:bg-blue-50 focus:bg-blue-50">
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Edit Materi
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive hover:bg-red-50 focus:bg-red-50"
                                          onClick={() => handleDeleteClick(item)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Hapus Materi
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </CardHeader>
                              <CardContent>
                                {/* Kirim status expanded hanya jika item ini yang sedang dibuka */}
                                <RenderContent item={item} isExpanded={expandedItem === category} />
                                <div className="flex gap-2 mt-4 flex-wrap">
                                  {item.tags.length > 0 ? (
                                    <>
                                      <Tag className="h-3 w-3 text-muted-foreground" />
                                      {item.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                      ))}
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Tidak ada tag</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  
                  {/* Bottom Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50 rounded-b-lg">
                      <div className="text-sm text-muted-foreground">
                        Halaman {currentPage} dari {totalPages} (Total {totalRecords} materi)
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
          </div>
        )}
      </div>

      {/* Render Dialogs */}
      {canManage && (
         <>
           {/* Dialog Tambah */}
           <AddKnowledgeDialog
             open={dialogs.add}
             onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
             onSuccess={handleSuccess}
           />
           
           {/* Dialog Edit */}
           {dialogs.edit && (
             <EditKnowledgeDialog
               open={!!dialogs.edit}
               onOpenChange={(open) => setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })}
               onSuccess={handleSuccess}
               knowledgeToEdit={dialogs.edit}
             />
           )}
           
           {/* Alert Hapus */}
           {dialogs.delete && (
             <DeleteKnowledgeAlert
               open={!!dialogs.delete}
               onOpenChange={(open) => setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })}
               onSuccess={handleSuccess}
               knowledgeToDelete={dialogs.delete}
             />
           )}
         </>
       )}
    </MainLayout>
  );
};

export default Knowledge;