# Fix untuk Halaman Hutang & Piutang (DebtReceivable)

## 📋 Ringkasan Permasalahan

Halaman "Saldo Hutang & Piutang" memiliki beberapa issue yang mencegah pengguna menambahkan data:

1. **RLS Policy yang Ketat** ❌
   - Database hanya memungkinkan `superadmin` dan `admin` untuk membuat/edit/delete data
   - UI memungkinkan `leader` juga membuat data → Permission Denied error
   
2. **Input Currency Handling Tidak Konsisten** ❌
   - Input menerima format dengan titik separator (1.000.000) tetapi parsing tidak proper
   - Dapat menyebabkan data invalid

3. **Error Handling Kurang Informatif** ❌
   - Error dari Supabase tidak ditampilkan dengan jelas
   - User tidak tahu apa yang salah

4. **Field Tidak Perlu di Insert** ❌
   - Mengirim `created_at` saat insert padahal database auto-generate
   - Dapat menyebabkan conflict

---

## ✅ Solusi yang Diterapkan

### 1️⃣ **Fix Component AddDebtReceivableDialog.tsx**

**Perbaikan Input Currency:**
```typescript
// SEBELUM (Salah)
value={formatCurrencyInput(field.value)}
onChange={e => field.onChange(e.target.value)}

// SESUDAH (Benar)
value={formatCurrencyInput(field.value)}
onChange={(e) => {
  const rawValue = e.target.value.replace(/[^0-9]/g, "");
  field.onChange(rawValue);
}}
```

**Perbaikan onSubmit:**
```typescript
// SEBELUM - Mengirim created_at
const { error } = await supabase
  .from("debt_receivable")
  .insert({
    type: values.type,
    created_at: format(values.transaction_date, "yyyy-MM-dd"),
    counterparty: values.counterparty,
    amount: finalAmount,
    // ... fields lainnya
  });

// SESUDAH - Tidak mengirim created_at (auto-generate)
const insertData = {
  type: values.type,
  counterparty: values.counterparty,
  amount: finalAmount,
  due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
  status: values.status,
  description: values.description || null,
  group_id: finalGroupId,
};

const { error } = await supabase
  .from("debt_receivable")
  .insert(insertData);

// Better error handling
if (error) {
  console.error("Supabase error:", error);
  throw error;
}
```

### 2️⃣ **Fix Component EditDebtDialog.tsx**

- Perbaikan input currency yang sama dengan AddDebtReceivableDialog
- Menghapus `created_at` dari UPDATE query (field ini tidak seharusnya diubah)
- Menambahkan better error logging dan messaging

### 3️⃣ **Fix RLS Policy di Supabase Database**

**PENTING: Ini adalah langkah kritis yang harus dilakukan!**

⚠️ **Opsi 1: Manual via Supabase Dashboard** (Recommended)

1. Buka: https://supabase.com/dashboard/project/degfdhoxmuzmccsouxnk
2. Klik menu **SQL Editor** di sidebar kiri
3. Klik tombol **New Query**
4. Copy-paste SQL berikut:

```sql
-- Fix RLS Policy for debt_receivable table
-- Allow superadmin, leader, and admin to manage debt_receivable

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view debt_receivable" ON public.debt_receivable;
DROP POLICY IF EXISTS "Superadmin and Admin can manage debt_receivable" ON public.debt_receivable;

-- Create new policies
CREATE POLICY "Everyone can view debt_receivable" ON public.debt_receivable FOR SELECT USING (true);

CREATE POLICY "Superadmin, Leader and Admin can manage debt_receivable" ON public.debt_receivable FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader', 'admin'))
);
```

5. Klik tombol **Run** (atau Ctrl+Enter)
6. Seharusnya ada pesan "Success" di bawah

---

## 🧪 Testing Checklist

Sebelum production, pastikan semua poin ini pass:

- [ ] **Login sebagai Superadmin/Leader/Admin**
  - Buka halaman "Saldo Hutang & Piutang"
  - Pastikan role user sudah benar di profile

- [ ] **Test Add Hutang Baru**
  - Klik tombol "Tambah Catatan"
  - Tab aktif harus "Hutang (Kewajiban)"
  - Isi form:
    - Tanggal: Hari ini
    - Pihak: "PT Supplier Test"
    - Nominal: "1000000" (atau ketik 1.000.000)
    - Jatuh Tempo: Besok
    - Status: "Belum Lunas"
  - Klik "Simpan Catatan"
  - ✅ Data muncul di tabel dengan nilai Rp 1.000.000

- [ ] **Test Add Piutang Baru**
  - Klik "Tambah Catatan"
  - Buka tab "Piutang (Tagihan)"
  - Isi form dengan data test (misal: Piutang 5.000.000 ke "Budi")
  - Klik "Simpan Catatan"
  - ✅ Data muncul di tab Piutang

- [ ] **Test Edit Data**
  - Klik menu tiga titik (⋮) di salah satu data
  - Pilih "Edit"
  - Ubah nominal: "2.000.000"
  - Ubah status: "Cicilan"
  - Klik "Simpan Catatan"
  - ✅ Data ter-update di tabel

- [ ] **Test Delete Data**
  - Klik menu tiga titik (⋮)
  - Pilih "Hapus"
  - Klik "Ya, Hapus Data"
  - ✅ Data hilang dari tabel

- [ ] **Test Filter**
  - Filter berdasarkan Grup
  - Filter berdasarkan Status
  - Filter berdasarkan Date Range
  - ✅ Tabel ter-filter dengan benar

- [ ] **Test Export**
  - Klik tombol "Export"
  - Pilih "Export PDF" atau "Export CSV"
  - ✅ File berhasil di-download

- [ ] **Test dengan Role Berbeda**
  - Test dengan user role "Staff" (should NOT bisa create/edit/delete)
  - Test dengan user role "Viewer" (should NOT bisa create/edit/delete)

---

## 📁 Files yang Dimodifikasi

| File | Perubahan |
|------|-----------|
| `src/components/DebtReceivable/AddDebtReceivableDialog.tsx` | Fix input currency handling, better error logging, remove created_at dari insert |
| `src/components/Debt/EditDebtDialog.tsx` | Fix input currency handling, remove created_at dari update, better error messages |
| `supabase/migrations/20251113_fix_debt_receivable_rls.sql` | **MANUAL** - Drop dan recreate RLS policies |
| `FIX_DEBT_RECEIVABLE.md` | Documentation ini |
| `run_migration.py` | Helper script untuk run migration (informational) |

---

## 🚨 Troubleshooting

### Error: "Permission Denied" saat mencoba add/edit/delete

**Solusi:**
1. Pastikan SQL migration sudah dijalankan di Supabase
2. Periksa role user: User harus memiliki role `superadmin`, `leader`, atau `admin`
3. Coba refresh page atau clear browser cache

### Error: "Invalid amount"

**Solusi:**
1. Pastikan input nominal hanya berisi angka (titik separator akan dihapus otomatis)
2. Nominal harus lebih dari 0
3. Coba clear field dan ketik ulang

### Data tidak muncul setelah di-add

**Solusi:**
1. Refresh page (F5)
2. Periksa apakah data masuk ke database (buka Supabase dashboard > debt_receivable table)
3. Cek filter yang aktif - pastikan tidak tersaring

### Error di Console

- Buka DevTools (F12)
- Masuk ke tab Console
- Cari error messages (biasanya berwarna merah)
- Copy error message dan cek di troubleshooting docs

---

## ℹ️ Notes untuk Developer

### Helper Functions di `src/lib/utils.ts`

```typescript
// Format number ke currency string dengan separator ribuan
formatCurrencyInput(value: string | number | null): string
// Contoh: 1000000 -> "1.000.000"

// Parse currency string kembali ke number
parseCurrencyInput(value: string | null): number
// Contoh: "1.000.000" -> 1000000
```

### RLS Policy Logic

Setelah fix, policy memberikan permission:
- **SELECT (Read)**: Everyone bisa view
- **INSERT/UPDATE/DELETE**: Hanya `superadmin`, `leader`, `admin`

### Database Schema

```sql
CREATE TABLE public.debt_receivable (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('debt', 'receivable')),
  counterparty TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  description TEXT,
  group_id UUID REFERENCES public.groups(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

## ✨ Next Steps (Future Improvements)

- [ ] Tambah validasi nominal lebih ketat (max/min values)
- [ ] Tambah recurring transaction support
- [ ] Tambah payment tracking / milestone
- [ ] Tambah notification system untuk jatuh tempo
- [ ] Tambah bulk import dari CSV/Excel
- [ ] Tambah analytics dashboard

---

## 📞 Support

Jika masih ada issue:
1. Periksa error message di browser console (F12)
2. Review checklist testing di atas
3. Pastikan SQL migration sudah dijalankan
4. Restart aplikasi (npm run dev)

**Last Updated**: 13 November 2025

