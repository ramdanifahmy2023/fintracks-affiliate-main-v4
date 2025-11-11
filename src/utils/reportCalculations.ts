import { DailyReportData } from "@/hooks/useDailyReports";

export interface ReportSummary {
  totalOmset: number;
  totalKomisi: number;
  totalAbsensi: number;
  reportCount: number;
  employeeCount: number;
  averageOmsetPerReport: number;
  kpiPercentage: number;
}

export interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  totalOmset: number;
  totalKomisi: number;
  reportCount: number;
  kpiPercentage: number;
}

// Fungsi untuk menghitung ringkasan laporan
export const calculateReportSummary = (
  reports: DailyReportData[],
  kpiTarget: number = 10000000 // Target KPI default
): ReportSummary => {
  if (!reports || reports.length === 0) {
    return {
      totalOmset: 0,
      totalKomisi: 0,
      totalAbsensi: 0,
      reportCount: 0,
      employeeCount: 0,
      averageOmsetPerReport: 0,
      kpiPercentage: 0,
    };
  }

  const totalOmset = reports.reduce((sum, report) => sum + (report.total_sales || 0), 0);
  const reportCount = reports.length;
  const employeeCount = new Set(reports.map((r) => r.employee_id)).size;
  const averageOmsetPerReport = reportCount > 0 ? totalOmset / reportCount : 0;
  const kpiPercentage = kpiTarget > 0 ? (totalOmset / kpiTarget) * 100 : 0;

  return {
    totalOmset,
    totalKomisi: 0, // Ini bisa dihitung dari commission table jika ada
    totalAbsensi: 0,
    reportCount,
    employeeCount,
    averageOmsetPerReport,
    kpiPercentage: Math.min(kpiPercentage, 100), // Cap di 100%
  };
};

// Fungsi untuk menghitung per employee
export const calculateEmployeeSummary = (
  reports: DailyReportData[]
): EmployeeSummary[] => {
  const grouped = reports.reduce(
    (acc, report) => {
      if (!acc[report.employee_id]) {
        acc[report.employee_id] = [];
      }
      acc[report.employee_id].push(report);
      return acc;
    },
    {} as Record<string, DailyReportData[]>
  );

  return Object.entries(grouped).map(([employeeId, employeeReports]) => {
    const totalOmset = employeeReports.reduce((sum, r) => sum + (r.total_sales || 0), 0);
    const reportCount = employeeReports.length;

    return {
      employeeId,
      employeeName: "", // Akan diisi dari employee table
      totalOmset,
      totalKomisi: 0,
      reportCount,
      kpiPercentage: 0,
    };
  });
};

// Fungsi untuk format currency
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

// Fungsi untuk menghitung rentang tanggal
export const getDateRangeReports = (
  reports: DailyReportData[],
  startDate: Date,
  endDate: Date
): DailyReportData[] => {
  return reports.filter((report) => {
    const reportDate = new Date(report.report_date);
    return reportDate >= startDate && reportDate <= endDate;
  });
};