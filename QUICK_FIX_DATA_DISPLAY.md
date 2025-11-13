# 🔧 QUICK FIX - Data Tidak Muncul di Halaman

**Issue**: Data sudah tersimpan di Supabase tapi tidak muncul di halaman  
**Root Cause**: Filter date default hanya menampilkan data dari HARI INI saja  
**Solusi**: Ubah default filter range menjadi 90 hari terakhir

---

## ✅ PERBAIKAN

### File: `src/pages/DebtReceivable.tsx`

**Perubahan 1**: Import tambahan
```typescript
// DITAMBAHKAN
import { format, parseISO, subDays } from "date-fns";
// DARI
import { format, parseISO } from "date-fns";
```

**Perubahan 2**: Default filter date
```typescript
// SEBELUM - Hanya hari ini
const [filterDateStart, setFilterDateStart] = useState(format(new Date(), "yyyy-MM-dd"));
const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));

// SESUDAH - 90 hari terakhir
const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
```

---

## 🎯 HASIL

| Sebelum | Sesudah |
|---------|---------|
| Data hanya muncul jika dibuat hari ini | Data muncul untuk 90 hari terakhir ✅ |
| User harus manual ubah filter | Auto filter range 90 hari ✅ |

---

## 📱 CARA TEST

1. Refresh halaman atau buka halaman DebtReceivable
2. Data dari Supabase sekarang akan muncul
3. Filter date otomatis 90 hari terakhir

---

## 💡 NOTES

- User masih bisa ubah filter date range kapan saja
- 90 hari adalah good default untuk kebanyakan use case
- Bisa disesuaikan di line 89-90 jika perlu

---

**Status**: ✅ FIXED  
**Testing**: Ready to verify
