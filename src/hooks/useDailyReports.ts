import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DailyReportData {
  id: string;
  employee_id: string;
  report_date: string;
  shift_number: string;
  device_id: string;
  account_id: string;
  opening_balance: number;
  closing_balance: number;
  total_sales: number;
  shift_status: string;
  live_status: string;
  kategori_produk: string;
  notes: string;
  created_at: string;
}

interface UseDailyReportsProps {
  groupId?: string;
  startDate?: string;
  endDate?: string;
}

export const useDailyReports = ({
  groupId,
  startDate,
  endDate,
}: UseDailyReportsProps) => {
  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  const fetchReports = async () => {
    if (!groupId) {
      setReports([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("daily_reports")
        .select(`
          id,
          employee_id,
          report_date,
          shift_number,
          device_id,
          account_id,
          opening_balance,
          closing_balance,
          total_sales,
          shift_status,
          live_status,
          kategori_produk,
          notes,
          created_at,
          employees (
            group_id
          )
        `)
        .order("report_date", { ascending: false });

      // Filter by group_id through employees relationship
      // Note: Ini adalah workaround karena RLS mungkin sudah filter
      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Filter di client-side jika perlu
      const filteredData = data?.filter((report: any) => {
        return report.employees?.group_id === groupId;
      }) || [];

      setReports(filteredData as DailyReportData[]);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching daily reports:", err);
    } finally {
      setLoading(false);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    fetchReports();

    // Subscribe to changes
    const subscription = supabase
      .channel("daily_reports_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_reports",
        },
        (payload) => {
          console.log("Daily reports updated:", payload);
          // Refresh data ketika ada perubahan
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [groupId]);

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
  };
};